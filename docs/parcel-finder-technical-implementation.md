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
│   │   │   └── FreeLandLayer.tsx # renders computed GeoJSON, hover styling + click selection
│   │   ├── sidebar/
│   │   │   ├── SiteDetails.tsx   # shadcn Sheet (right side) with selected site data
│   │   │   └── EmptyState.tsx    # shown when nothing is selected
│   │   └── ui/                   # shadcn/ui generated components (button, card, sheet, etc.)
│   ├── lib/
│   │   ├── config.ts             # tuning knobs: query tags, MIN_ZOOM, MIN_AREA_M2, classify/exclude tables
│   │   ├── overpass.ts           # Overpass API query builder + fetch
│   │   ├── geometry.ts           # Turf-based computation (difference, area, etc.)
│   │   ├── cache.ts              # bbox-keyed in-memory (or IndexedDB) cache
│   │   └── geocode.ts            # optional Nominatim reverse-geocode helper
│   ├── hooks/
│   │   ├── useViewportData.ts    # ties map moveend → debounced fetch → computed layer
│   │   └── useSelectedFeature.ts # shared selection state; opens/closes the side panel
│   ├── types/
│   │   └── geo.ts                # shared TS types (GeoJSON feature properties, etc.)
│   └── styles/
│       └── globals.css           # Tailwind base + shadcn theme tokens
├── public/
├── index.html
├── tailwind.config.js
├── vite.config.ts
└── tsconfig.json
```

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
6. Response parsed → converted to GeoJSON (osmtogeojson or manual mapping)
        │
7. lib/geometry.ts:
   - group landuse polygons vs. building polygons
   - for each landuse polygon: turf.difference(landuse, unionOfOverlappingBuildings)
   - result = candidate "free land" polygons
   - attach computed properties: area (turf.area), landuse tag, centroid
        │
8. Result stored in cache (keyed by bbox, or by tile if using a tiling scheme)
        │
9. FreeLandLayer renders result as <GeoJSON> react-leaflet layer
        │
10. User hovers an empty-site polygon → Leaflet fires mouseover → layer restyled
    to transparent gray (style-only; no shared state change)
        │
11. User clicks an empty-site polygon → useSelectedFeature stores it and opens the side Sheet
        │
12. Click elsewhere on the map → taken-site check (section 3.7): point-in-polygon
    against cached building/taken polygons → hit: selected as "taken";
    no hit: selection cleared, Sheet closes
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
- Converting the raw Overpass JSON response into GeoJSON (via `osmtogeojson` or a small custom mapper if the dependency feels heavier than needed)

### 3.2 "Free land" computation

`lib/geometry.ts` exposes a pure function:

```ts
function computeFreeLand(
  landuse: FeatureCollection<Polygon>,
  buildings: FeatureCollection<Polygon>,
): FeatureCollection<Polygon>;
```

Approach:

1. For each landuse polygon, find buildings whose bbox intersects it (cheap pre-filter before expensive geometry ops).
2. Union the intersecting buildings (`turf.union`) if there's more than one.
3. Subtract that union from the landuse polygon (`turf.difference`).
4. Discard slivers below a minimum area threshold (`MIN_AREA_M2`, 100 m² in `lib/config.ts` —
   at the zoom-15 gate that is ~3 px; smaller fragments are imprecise-tracing noise, not plots).
5. Attach `area`, `landuseType`, `status` (`empty`), and `id` to each result's `properties`.

`classifyLandUse` enforces the empty/taken policy from the product doc; the classify table
(`LAND_USE_TAG_MAP`) and the excluded types (`TAKEN_LAND_USE_TYPES`) live in `lib/config.ts`.
Tag keys are checked in a fixed order — `natural`, `leisure`, `boundary` before `landuse` — so
physical cover/amenity beats zoning: a wood or park co-tagged with grass is still taken.
Forests (`natural=wood`), water, parks/protected areas and the tuned edge categories
(cemetery, quarry, railway, construction, education, religious, garages, recreation ground,
military) are **taken** and never become candidates; farmland, orchards, meadow, grass, scrub,
brownfield and similar are **empty**. Buildings are taken by definition.

Only **empty** candidates come out of `computeFreeLand`. The raw fetched features (buildings,
forest/water/park polygons — everything classified **taken**) are kept from the step-02 fetch and
are used by the click-time taken-site check (section 3.7).

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
        L.DomEvent.stopPropagation(e); // keep the map-level taken-check (3.7) from firing
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
  selected feature and drives the side `Sheet` (open/close + content). The selected polygon keeps
  the gray style while selected; deselecting reverts it.
- Features carry a `status` (`'empty'` | `'taken'`) so `SiteDetails` can show the taken notice
  when applicable.
- Clicks that miss every empty polygon fall through to the map-level handler (section 3.7).

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

### 3.7 Taken-site detection (click fallback)

Empty candidates are the only rendered/interactive polygons, so a click on a taken site (a
building, a forest, a lake) hits the bare map. A map-level `click` handler on `MapContainer`
resolves it:

1. Skip if a polygon layer already consumed the click (layer clicks call
   `L.DomEvent.stopPropagation`, see 3.3).
2. Build a point from the click lat/lng and run `turf.booleanPointInPolygon` against the cached
   raw viewport features — building polygons first, then taken landuse/natural polygons
   (everything in `TAKEN_LAND_USE_TYPES`, `lib/config.ts`).
3. On a hit: select that raw feature with `status: 'taken'` — the Sheet opens showing the taken
   notice plus its properties (type from tags, `turf.area` for polygons).
4. On a miss (no OSM polygon under the cursor): clear the selection and close the Sheet.

Limitation (by design): ground with no OSM landuse/landcover tags is undetectable — it behaves
like a miss and simply closes the panel. This is part of the documented "heuristic approximation"
caveat.

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

- **Unit tests** (Vitest) for `lib/geometry.ts` and `lib/overpass.ts` — these are pure functions and the highest-value place to test, since they contain the actual "business logic" of the app.
- **Component tests** (React Testing Library) for `SiteDetails` and `FreeLandLayer`'s hover behavior, using mocked feature data.
- **Manual/exploratory testing** for the map interaction itself — end-to-end map testing has a poor effort/value ratio for a personal project.

## 7. Environment & Config

No environment variables are required — every data source used is key-free and the app runs as a
static site with no backend.

## 8. Deployment

- **Frontend:** static build (`vite build`) deployed to Vercel/Netlify/Cloudflare Pages.

## 9. Implementation Order (mirrors milestones in the purpose doc, with technical detail)

1. Scaffold Vite + TS + Tailwind + shadcn/ui; verify `MapView` renders OSM tiles.
2. Implement `lib/overpass.ts` with a hardcoded bbox first (no map wiring yet) — verify raw data shape.
3. Implement `lib/geometry.ts` (`computeFreeLand`) against that hardcoded data; unit test it.
4. Wire `useViewportData` to real map `moveend` events; add debounce + zoom gate.
5. Render `FreeLandLayer`: transparent-gray hover styling (style-only) + click selection via `useSelectedFeature`; add the map-level taken-site check (section 3.7).
6. Build `SiteDetails` as a right-side `Sheet` off the shared selection state, with the "taken" notice for taken sites.
7. Add caching layer, error/empty states, basemap toggle.
8. (Stretch) subdivision suggestion module, saved sites, shareable view links.
