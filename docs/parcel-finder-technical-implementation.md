# Parcel Finder — Technical Implementation Documentation

**Companion to:** `parcel-finder-app-documentation.md` (purpose, stack, dependencies)
**Scope of this doc:** how the app is actually built — project structure, data flow, algorithms, component responsibilities, and implementation decisions.

## 1. Project Structure

```text
parcel-finder/
├── src/
│   ├── main.tsx                  # app entry point
│   ├── App.tsx                   # top-level layout (map + side panel)
│   ├── components/
│   │   ├── map/
│   │   │   ├── MapView.tsx       # Leaflet map wrapper (react-leaflet)
│   │   │   ├── BasemapToggle.tsx # OSM / satellite switch
│   │   │   ├── FreeLandLayer.tsx # renders free candidates, hover styling + click selection
│   │   │   ├── TakenSiteLayer.tsx# renders raw taken features in red, click selection
│   │   │   └── MapOverlay.tsx    # hint pills over the map (loading, zoom-in, no results)
│   │   ├── sidebar/
│   │   │   ├── SiteDetails.tsx   # shadcn Sheet (right side) with selected site data
│   │   │   └── EmptyState.tsx    # shown when nothing is selected
│   │   └── ui/                   # shadcn/ui generated components (button, card, sheet, sonner, …)
│   ├── lib/
│   │   ├── config.ts             # tuning knobs: query tags, MIN_ZOOM, MIN_AREA_M2, classify/exclude tables
│   │   ├── overpass.ts           # Overpass API query builder + fetch + GeoJSON mapper
│   │   ├── geometry.ts           # Turf-based computation (area, bbox, centroid, …)
│   │   ├── cache.ts              # bbox-keyed in-memory cache (LRU-capped)
│   │   ├── format.ts             # display formatting helpers (area, …)
│   │   ├── mapState.ts           # viewport/basemap persistence (localStorage)
│   │   └── utils.ts              # cn() class-merge helper
│   ├── hooks/
│   │   ├── useViewportData.ts    # ties map moveend → debounced fetch → computed layer
│   │   └── useSelectedFeature.tsx # shared selection state; opens/closes the side panel
│   ├── types/
│   │   ├── geo.ts                # shared TS types (GeoJSON feature properties, etc.)
│   │   └── overpass.ts           # Overpass response element types
│   ├── test/
│   │   ├── memoryStorage.ts      # storage fake for tests
│   │   └── leafletLayers.ts      # test helper: GeoJSON paths from a rendered map
│   └── styles/
│       └── globals.css           # Tailwind v4 (CSS-first) + shadcn theme tokens — no tailwind.config.js
├── index.html
├── vite.config.ts                # also configures vitest (happy-dom, globals)
├── postcss.config.js
├── eslint.config.js
└── tsconfig.json
```

Modules with logic carry a co-located `*.test.ts(x)` file, run by `npm run test`. There is no
`public/` folder and no server-side `geocode.ts` — Nominatim reverse-geocoding (optional in the
product doc) is not implemented in v1.

Rationale: `lib/` holds pure, testable functions with no React dependency (query building, geometry math, caching). `hooks/` wires that logic into React's lifecycle. `components/` stays presentational as much as possible.

## 2. Data Flow (Detailed)

```text
1. Map moveend/zoomend fires
        │
2. useViewportData hook: debounce (~500ms), check zoom ≥ MIN_ZOOM
        │
3. Compute current bbox → check cache (lib/cache.ts)
        │  cache hit ──────────────► use cached GeoJSON
        │  cache miss
        ▼
4. lib/overpass.ts: build Overpass QL query for bbox
   - ways/relations tagged building=*
   - ways/relations tagged landuse=*, natural=*, leisure=*
        │
5. fetch() → Overpass API (direct client-side call)
        │
6. Response parsed → converted to GeoJSON by the custom mapper in lib/overpass.ts
        │
7. lib/geometry.ts:
   - group landuse polygons vs. building polygons
   - for each landuse polygon: a building on it (bbox intersect) takes the
     polygon as a whole; taken land-use types join the taken output the same way
   - result = candidate "free land" polygons + raw taken polygons
   - attach computed properties to candidates: area (turf.area), landuse tag, centroid
        │
8. Result stored in cache (keyed by bbox, or by tile if using a tiling scheme)
        │
9. TakenSiteLayer renders the raw taken features in red (below), FreeLandLayer
   renders the candidates on top — both as <GeoJSON> react-leaflet layers
        │
10. User hovers an empty-site polygon → Leaflet fires mouseover → layer restyled
    to transparent gray (style-only; no shared state change; taken sites get
    no hover effect)
        │
11. User clicks a polygon → useSelectedFeature stores it (taken status for the
    red layer) and opens the side Sheet
        │
12. Click elsewhere on the map (bare map, no polygon consumed the click) →
    selection cleared, Sheet closes
        │
13. SiteDetails Sheet renders the selected site's properties (with a "taken"
    notice for taken sites)
```

## 3. Key Implementation Details

### 3.1 Overpass query construction

Query is built dynamically from the current bounding box. Example shape (illustrative, not final):

```text
[out:json][timeout:25];
(
  way["building"]({{bbox}});
  way["landuse"]({{bbox}});
  way["natural"]({{bbox}});
);
out body;
>;
out skel qt;
```

`lib/overpass.ts` is responsible for:

- Injecting the current bbox
- Choosing which tags to query — the tag list (`QUERY_TAGS`) lives in `lib/config.ts`, so the "what counts as land" heuristic is a config change, not a code hunt
- Converting the raw Overpass JSON response into GeoJSON with the custom mapper
  `overpassToGeoJSON` — `osmtogeojson` was evaluated and rejected (vulnerable transitive
  dependencies, and its extra features are unused since the app queries with `[out:json]`). The
  mapper keeps closed ways carrying polygon tags as simple Polygons and skips the rest; relations
  are not resolved (documented v1 limitation).

### 3.2 "Free land" computation

`lib/geometry.ts` exposes a pure function:

```ts
function computeSites(
  landuse: FeatureCollection<Polygon>,
  buildings: FeatureCollection<Polygon>,
): { freeLand: FeatureCollection<Polygon>; takenLanduse: RawOsmFeature[] };
```

Approach (per landuse polygon):

1. Taken land-use type (`TAKEN_LAND_USE_TYPES`) → promote the raw polygon to the taken output.
2. A building that actually intersects the polygon takes it **as a whole** (step-12 product
   decision: a single barn marks the whole field taken — no remainder/hole is computed).
   The building bbox check is a cheap prefilter; the precise `turf.booleanIntersects` test
   runs only on the few bbox-matched pairs, so bbox-corner near-misses (concave polygons)
   stay empty.
3. Discard slivers below a minimum area threshold (`MIN_AREA_M2`, 100 m² in `lib/config.ts` —
   at the zoom-15 gate that is ~3 px; smaller fragments are imprecise-tracing noise, not plots).
4. Otherwise attach `area` (`turf.area`), `landuseType`, `status` (`empty`), and `id`, plus the
   centroid, and keep it as a free-land candidate.

`classifyLandUse` enforces the empty/taken policy from the product doc; the classify table
(`LAND_USE_TAG_MAP`) and the excluded types (`TAKEN_LAND_USE_TYPES`) live in `lib/config.ts`.
Tag keys are checked in a fixed order — `natural`, `leisure`, `boundary` before `landuse` — so
physical cover/amenity beats zoning: a wood or park co-tagged with grass is still taken.
Forests (`natural=wood`), water, parks/protected areas and the tuned edge categories
(cemetery, quarry, railway, construction, education, religious, garages, recreation ground,
military) are **taken** and never become candidates; farmland, orchards, meadow, grass, scrub,
brownfield and similar are **empty**. Buildings are taken by definition.

`computeViewportSites` assembles the two outputs in one pass over the raw fetch: the free-land
candidates for the green layer, and the raw taken features (buildings first, then the promoted
and classified-taken landuse polygons) for the red layer.

This function is pure and unit-testable independent of the map/UI.

### 3.3 Hover & click interaction

Per the product doc, hover is purely visual (transparent gray) and the side panel is
click-driven. react-leaflet's `<GeoJSON>` component with an `onEachFeature` callback handles
both; Leaflet already does per-feature pointer-event handling natively:

```tsx
// transparent gray fill + gray borders (product spec)
const hoverStyle = { fillOpacity: 0.3, color: '#9ca3af', fillColor: '#9ca3af' };

<GeoJSON
  data={freeLandFeatures}
  style={defaultStyle}
  onEachFeature={(feature, layer) => {
    layer.on({
      // Empty sites only — taken sites are not in this layer, so they get no hover effect.
      mouseover: (e) => e.target.setStyle(hoverStyle),
      mouseout: (e) => e.target.setStyle(defaultStyle),
      click: (e) => {
        L.DomEvent.stopPropagation(e); // keep the map-level deselect handler from firing
        selectFeature({ ...feature, properties: { ...feature.properties, status: 'empty' } });
      },
    });
  }}
/>;
```

Key points:

- Hovering updates the layer style only — it deliberately does **not** touch shared state or the
  panel (product decision: the panel opens on click).
- `selectFeature` comes from `useSelectedFeature`, a small Context-backed hook that holds the
  selected feature and drives the side `Sheet` (open/close + content). While selected, the
  clicked polygon keeps a distinct highlighted style (weight-2 border, brighter fill — emerald
  for empty sites, red for taken sites), shared with the taken layer through
  `useSelectedSiteStyle`; deselecting reverts it. The sheet's map overlay is a light dim only
  — no backdrop blur, so the selected site stays crisp.
- Features carry a `status` (`'empty'` | `'taken'`) so `SiteDetails` can show the taken notice
  when applicable.
- Clicks on taken sites are consumed by the red layer (section 3.7); clicks that miss every
  polygon fall through to the map-level handler, which clears the selection.

### 3.4 Caching strategy

- Cache key: rounded bbox (snap to a coarse grid, e.g. ~0.01°) so small pans within the same area reuse data instead of refetching.
- Storage: in-memory `Map` for v1 (simplest, resets on reload); can upgrade to `IndexedDB` later if persistence across sessions becomes desirable.
- Cache invalidation: not time-based for v1 — OSM landuse/building data doesn't change fast enough to need TTL for a personal tool. Manual "refresh area" action can be added if it becomes annoying.

### 3.5 Debounce & zoom gating

- `useViewportData` debounces `moveend` events (~500ms) to avoid firing a request on every intermediate pan frame.
- A `MIN_ZOOM` constant (15, in `lib/config.ts`) prevents Overpass queries at city/country zoom levels, where bbox would be huge and the response enormous/slow. Below `MIN_ZOOM`, the layer is simply hidden and the map shows a subtle "zoom in to see candidate sites" hint. The value was measured (step 10): on one dense-city viewport, zoom 14 already pulls ~62 MiB / 53k elements / ~6 s, while 15 needs ~25 MiB / 19k / ~3 s and 16 would hide too much for exploring.

### 3.6 No backend proxy (decision)

Step 09 resolved the open question: no server-side proxy for v1. Direct client-side Overpass calls
proved stable across steps 02-08 (no persistent rate limiting, CORS, or timeout issues), and the
client-side protections already in place keep request volume low:

- grid-snapped bbox cache (`lib/cache.ts`) avoids redundant fetches on small pans;
- debounce + zoom gating (`useViewportData`) limits request frequency and scope;
- two-endpoint failover with one retry on 429/5xx handles transient rate limits.

Revisit if usage grows (e.g. multiple users or heavy daily use), at which point an in-memory cache
behind a single Overpass forwarder is the smallest viable option.

### 3.7 Taken sites on the map

Since step 12, taken sites are rendered and clickable — the old map-level point-in-polygon
fallback was retired once the layer covered every fetched feature:

- `TakenSiteLayer` renders the raw taken features (buildings, forest/water/park polygons,
  built-on landuse polygons) in red — subtle fill at 0.15 opacity with a visible border, the
  same opacities as the green layer. It sits **below** the free-land layer so green candidates
  stay on top where polygons are adjacent, and respects the same `belowMinZoom` gate and
  remount-per-fetch `key` pattern.
- A landuse polygon with a building on it is taken **as a whole** (section 3.2) — it renders
  red and never appears as a green remainder with a hole.
- Clicking a red feature selects it with `status: 'taken'` (same selection context, propagation
  stop as the free-land layer); the Sheet opens showing the taken notice plus its properties
  (type from tags, `turf.area` on open). Taken sites get **no hover effect** — the red fill is
  the cue.
- A bare-map click (no polygon consumed it) clears the selection and closes the Sheet.

Limitation (by design): multipolygon relations are not fetched (section 3.1), so ground mapped
only as a relation is undetectable — a bare-map click there simply closes the panel. This is
part of the documented "heuristic approximation" caveat.

## 4. State Management

No global state library is needed at this scale. State lives in:

- **Map viewport state** — owned by `MapView` / react-leaflet internally.
- **Fetched/computed features** — owned by `useViewportData`, exposed via return value.
- **Selected feature** — owned by a small React Context (`useSelectedFeature`) so map and side panel can share it without prop drilling; it also drives the panel's open/closed state. Hover styling stays local to the layer and is deliberately not shared state.

If the app grows (saved sites, filters, settings persisted across sessions), a lightweight store like **Zustand** is the natural next step rather than introducing Redux.

## 5. Error & Edge Case Handling

| Case                                                  | Handling                                                                                                                              |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Overpass request fails / times out                    | Show a non-blocking toast (shadcn `Toast`/`Sonner`); keep last successful layer visible if any                                        |
| Zoom below `MIN_ZOOM`                                 | Hide free-land layer, show "zoom in" hint instead of querying                                                                         |
| Empty result (no candidate land in view)              | Side panel shows an explicit empty state, not a blank panel                                                                           |
| Turf operations on invalid/self-intersecting polygons | Wrap geometry calls in try/catch per-feature so one bad OSM polygon doesn't break the whole batch; skip and log the offending feature |
| Overpass rate limiting                                | Exponential backoff on retry; rely on caching to minimize repeat requests                                                             |

## 6. Testing Approach

- **Setup:** Vitest 4 with the `happy-dom` environment (not jsdom) and globals enabled, configured
  in `vite.config.ts`; React Testing Library for component tests. `@testing-library/jest-dom` was
  dropped — plain assertions. Tests run with `npm run test`.
- **Unit tests** for the pure `lib/` modules (`geometry.ts`, `overpass.ts`, `cache.ts`,
  `format.ts`, `mapState.ts`) and the `useViewportData` hook — these contain the actual "business
  logic" of the app.
- **Component tests** for `App`, `MapView`, `FreeLandLayer`, `TakenSiteLayer`, `BasemapToggle`
  and `SiteDetails`, using mocked feature data.
- **Manual/exploratory testing** for the map interaction itself — end-to-end map testing has a poor effort/value ratio for a personal project.

## 7. Environment & Config

No environment variables are required — every data source used is key-free and the app runs as a
static site with no backend.

## 8. Deployment

- **Frontend:** static build (`vite build`) deployed to Vercel/Netlify/Cloudflare Pages.

## 9. Implementation Order (mirrors milestones in the purpose doc, with technical detail)

1. Scaffold Vite + TS + Tailwind + shadcn/ui; verify `MapView` renders OSM tiles.
2. Implement `lib/overpass.ts` with a hardcoded bbox first (no map wiring yet) — verify raw data shape.
3. Implement `lib/geometry.ts` (`computeSites`) against that hardcoded data; unit test it.
4. Wire `useViewportData` to real map `moveend` events; add debounce + zoom gate.
5. Render `FreeLandLayer`: transparent-gray hover styling (style-only) + click selection via `useSelectedFeature`; render `TakenSiteLayer` in red below it (section 3.7); a bare-map click deselects.
6. Build `SiteDetails` as a right-side `Sheet` off the shared selection state, with the "taken" notice for taken sites.
7. Add caching layer, error/empty states, basemap toggle.
8. (Stretch) subdivision suggestion module, saved sites, shareable view links.
