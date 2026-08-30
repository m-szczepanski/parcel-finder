# 02 — Overpass data pipeline

**Depends on:** 01 (needs map events)
**Status:** not started

## Goal

Fetch real OSM data for the current viewport and turn it into typed GeoJSON, the input for the
geometry step. Implements Milestone 2 (data fetch) including debounce and zoom gating.

## Current state

- `src/lib/overpass.ts`: `buildOverpassQuery(bounds)` works and is tested; `fetchOverpassData()`
  is a stub returning `{ elements: [] }`.
- `src/hooks/useViewportData.ts`: stub — no debounce, no fetch, returns empty FeatureCollection.
- Query already uses `out body geom;` so every way comes back with inline geometry — no node
  resolution needed.
- `osmtogeojson` was deliberately rejected (vulnerable transitive `@xmldom`); we use a small
  custom mapper as allowed by the tech doc (section 3.1).

## Tasks

- [ ] Overpass element types (`types/overpass.ts` or extend `types/geo.ts`): minimal shapes for
      `way` with `geometry: { lat, lon }[]` and `tags`.
- [ ] `fetchOverpassData(bounds: ViewportBounds)`: GET to
      `https://overpass-api.de/api/interpreter?data=<encoded query>`, 25 s timeout via
      `AbortSignal.timeout`, throw on `!response.ok`, return parsed JSON.
- [ ] `overpassToGeoJSON(elements)` mapper in `lib/overpass.ts`:
  - closed ways (first point == last point, >= 4 points) with `building` / `landuse` /
    `natural` / `leisure` tags -> Polygon features;
  - skip open ways;
  - skip relations for v1 (note as limitation);
  - keep `id` (`way/123`) and raw `tags` in feature properties.
- [ ] Rework `useViewportData(map)`:
  - subscribe to `moveend`/`zoomend` via the map instance from step 01;
  - debounce ~500 ms (hand-rolled `setTimeout` in an effect, no new dep);
  - gate on `zoom >= MIN_ZOOM` (15) — below it, return empty data + a `belowMinZoom` flag;
  - guard against stale responses (request id ref or `AbortController`);
  - expose `{ data, loading, error, belowMinZoom }`.
- [ ] Log/inspect fetched counts per bbox during development (temporary debug output).

## Implementation notes

- Direct client-side calls for now; the proxy decision is step 09. Public instances are
  rate-limited — keep request volume low while developing (this is why zoom gating matters).
- GET (not POST) keeps the query cacheable and matches the server proxy contract if built later.
- Grid-snapped cache keys come in step 07 — do not conflate here; keep the fetch bbox exact.

## Exit criteria

- [ ] Panning the map (above zoom 15) triggers exactly one request per settled move, visible in
      the network tab.
- [ ] Mapper unit tests: closed way -> Polygon, open way skipped, tagged way keeps `id`/`tags`.
- [ ] No fetches fire below zoom 15.
- [ ] lint / typecheck / test / build all green.

## Files touched

`src/lib/overpass.ts`, `src/hooks/useViewportData.ts`, `src/types/` (new element types),
`src/lib/overpass.test.ts` (extend).
