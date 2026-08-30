# Parcel Finder — Technical Implementation Documentation

**Companion to:** `parcel-finder-app-documentation.md` (purpose, stack, dependencies)
**Scope of this doc:** how the app is actually built — project structure, data flow, algorithms, component responsibilities, and implementation decisions.

## 1. Project Structure

```
parcel-finder/
├── src/
│   ├── main.tsx                  # app entry point
│   ├── App.tsx                   # top-level layout (map + sidebar)
│   ├── components/
│   │   ├── map/
│   │   │   ├── MapView.tsx       # Leaflet map wrapper (react-leaflet)
│   │   │   ├── BasemapToggle.tsx # OSM / satellite switch
│   │   │   └── FreeLandLayer.tsx # renders computed GeoJSON, handles hover events
│   │   ├── sidebar/
│   │   │   ├── SiteDetails.tsx   # shadcn Card/Sheet showing hovered site data
│   │   │   └── EmptyState.tsx    # shown when nothing is hovered
│   │   └── ui/                   # shadcn/ui generated components (button, card, sheet, etc.)
│   ├── lib/
│   │   ├── overpass.ts           # Overpass API query builder + fetch
│   │   ├── geometry.ts           # Turf-based computation (difference, area, etc.)
│   │   ├── cache.ts              # bbox-keyed in-memory (or IndexedDB) cache
│   │   └── geocode.ts            # optional Nominatim reverse-geocode helper
│   ├── hooks/
│   │   ├── useViewportData.ts    # ties map moveend → debounced fetch → computed layer
│   │   └── useHoveredFeature.ts  # shared hover state between map layer and sidebar
│   ├── types/
│   │   └── geo.ts                # shared TS types (GeoJSON feature properties, etc.)
│   └── styles/
│       └── globals.css           # Tailwind base + shadcn theme tokens
├── server/                       # optional thin proxy (only if needed)
│   └── index.ts                  # Express route: /api/overpass?bbox=...
├── public/
├── index.html
├── tailwind.config.js
├── vite.config.ts
└── tsconfig.json
```

Rationale: `lib/` holds pure, testable functions with no React dependency (query building, geometry math, caching). `hooks/` wires that logic into React's lifecycle. `components/` stays presentational as much as possible.

## 2. Data Flow (Detailed)

```
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
5. fetch() → Overpass API (directly, or via /api/overpass proxy)
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
10. User hovers a polygon → Leaflet fires mouseover on that Layer
        │
11. useHoveredFeature hook updates shared state with feature.properties
        │
12. SiteDetails sidebar re-renders with the new properties
```

## 3. Key Implementation Details

### 3.1 Overpass query construction

Query is built dynamically from the current bounding box. Example shape (illustrative, not final):

```
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
- Choosing which tags to query (configurable, so the "what counts as land" heuristic can be tuned without touching fetch logic)
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
4. Discard slivers below a minimum area threshold (avoids noisy, meaningless tiny fragments from imprecise OSM tracing).
5. Attach `area`, `landuseType`, and `id` to each result's `properties`.

This function is pure and unit-testable independent of the map/UI.

### 3.3 Hover interaction

Using react-leaflet's `<GeoJSON>` component with an `onEachFeature` callback, rather than manual DOM/canvas hit-testing — Leaflet already does per-feature pointer-event handling natively:

```tsx
<GeoJSON
  data={freeLandFeatures}
  style={defaultStyle}
  onEachFeature={(feature, layer) => {
    layer.on({
      mouseover: () => {
        layer.setStyle(hoverStyle);
        setHoveredFeature(feature);
      },
      mouseout: () => {
        layer.setStyle(defaultStyle);
        setHoveredFeature(null);
      },
    });
  }}
/>
```

`setHoveredFeature` comes from `useHoveredFeature`, a small shared hook (Context-backed) so `SiteDetails` in the sidebar can read the same state without prop-drilling through `MapView`.

### 3.4 Caching strategy

- Cache key: rounded bbox (snap to a coarse grid, e.g. ~0.01°) so small pans within the same area reuse data instead of refetching.
- Storage: in-memory `Map` for v1 (simplest, resets on reload); can upgrade to `IndexedDB` later if persistence across sessions becomes desirable.
- Cache invalidation: not time-based for v1 — OSM landuse/building data doesn't change fast enough to need TTL for a personal tool. Manual "refresh area" action can be added if it becomes annoying.

### 3.5 Debounce & zoom gating

- `useViewportData` debounces `moveend` events (~500ms) to avoid firing a request on every intermediate pan frame.
- A `MIN_ZOOM` constant (e.g. 15) prevents Overpass queries at city/country zoom levels, where bbox would be huge and the response enormous/slow. Below `MIN_ZOOM`, the layer is simply hidden and the map shows a subtle "zoom in to see candidate sites" hint.

### 3.6 Optional backend proxy

If direct client-side Overpass calls prove flaky (public instance rate limits, CORS), `server/index.ts` exposes a single route:

```
GET /api/overpass?bbox=<south,west,north,east>
```

which forwards the query server-side, applies basic response caching, and returns JSON to the client. This is intentionally minimal — no database, no auth, since it's a personal tool.

## 4. State Management

No global state library is needed at this scale. State lives in:

- **Map viewport state** — owned by `MapView` / react-leaflet internally.
- **Fetched/computed features** — owned by `useViewportData`, exposed via return value.
- **Hovered feature** — owned by a small React Context (`useHoveredFeature`) so map and sidebar can share it without prop drilling.

If the app grows (saved sites, filters, settings persisted across sessions), a lightweight store like **Zustand** is the natural next step rather than introducing Redux.

## 5. Error & Edge Case Handling

| Case                                                  | Handling                                                                                                                              |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Overpass request fails / times out                    | Show a non-blocking toast (shadcn `Toast`/`Sonner`); keep last successful layer visible if any                                        |
| Zoom below `MIN_ZOOM`                                 | Hide free-land layer, show "zoom in" hint instead of querying                                                                         |
| Empty result (no candidate land in view)              | Sidebar shows an explicit empty state, not a blank panel                                                                              |
| Turf operations on invalid/self-intersecting polygons | Wrap geometry calls in try/catch per-feature so one bad OSM polygon doesn't break the whole batch; skip and log the offending feature |
| Overpass rate limiting                                | Exponential backoff on retry; rely on caching to minimize repeat requests                                                             |

## 6. Testing Approach

- **Unit tests** (Vitest) for `lib/geometry.ts` and `lib/overpass.ts` — these are pure functions and the highest-value place to test, since they contain the actual "business logic" of the app.
- **Component tests** (React Testing Library) for `SiteDetails` and `FreeLandLayer`'s hover behavior, using mocked feature data.
- **Manual/exploratory testing** for the map interaction itself — end-to-end map testing has a poor effort/value ratio for a personal project.

## 7. Environment & Config

```
# .env (if backend proxy is used)
OVERPASS_API_URL=https://overpass-api.de/api/interpreter
PORT=3001
```

No secrets are required for v1 — every data source used is key-free.

## 8. Deployment

- **Frontend:** static build (`vite build`) deployed to Vercel/Netlify/Cloudflare Pages.
- **Backend proxy (if used):** deployed as a serverless function on the same platform (e.g. Vercel Functions) rather than a standalone server, to keep hosting free and maintenance minimal.

## 9. Implementation Order (mirrors milestones in the purpose doc, with technical detail)

1. Scaffold Vite + TS + Tailwind + shadcn/ui; verify `MapView` renders OSM tiles.
2. Implement `lib/overpass.ts` with a hardcoded bbox first (no map wiring yet) — verify raw data shape.
3. Implement `lib/geometry.ts` (`computeFreeLand`) against that hardcoded data; unit test it.
4. Wire `useViewportData` to real map `moveend` events; add debounce + zoom gate.
5. Render `FreeLandLayer`, add hover styling + `useHoveredFeature`.
6. Build `SiteDetails` sidebar off the shared hover state.
7. Add caching layer, error/empty states, basemap toggle.
8. (Stretch) subdivision suggestion module, saved sites, shareable view links.
