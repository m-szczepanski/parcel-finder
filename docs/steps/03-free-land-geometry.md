# 03 — Free-land geometry

**Depends on:** 02 (needs fetched GeoJSON)
**Status:** done

## Goal

Implement the core "business logic": subtract building footprints from landuse polygons to
produce candidate free-land polygons with computed properties. Pure, unit-tested, no React.

## Current state

- `src/lib/geometry.ts`: `computeFreeLand()` is a stub returning an empty FeatureCollection;
  `normalizeViewportBounds` is implemented and tested.
- `@turf/turf@7` installed. Note the Turf 7 API changes versus the docs' v6 examples.
- `LandUseType` union exists in `types/geo.ts` but has no mapping from OSM tags yet.

## Tasks

- [x] `computeFreeLand(landuse, buildings): CandidateSiteFeatureCollection`: 1. pre-filter buildings per landuse polygon using `turf.bbox` overlap (cheap numeric test); 2. union the overlapping buildings — **Turf 7: `union()` takes a FeatureCollection**,
      not pairwise args; 3. `difference(landusePolygon, buildingUnion)` — can return `null` (full overlap); 4. discard slivers below `MIN_AREA_M2` (start at 50, tuned in step 10); 5. attach `id`, `landuseType`, `area` (`turf.area`), `centroid` to properties; 6. wrap each feature in try/catch — one invalid OSM polygon must not break the batch
      (log and skip).
- [x] `classifyLandUse(tags): LandUseType` — map `landuse=residential|commercial|industrial`,
      `natural=grass|scrub` etc. to the existing union; fall back to `unknown`.
      Keep the table inline and small; the exclude/include policy is tuned in step 10.
- [x] Enforce the empty/taken policy (product decision, app doc section 8): forests
      (`natural=wood`), water, parks/protected areas are **taken** and must not become free-land
      candidates; farmland, meadow, grass, scrub, brownfield etc. are **empty**. Tag each output
      feature `status: 'empty'`, and keep the raw building/taken polygons from the step-02 fetch
      available for the click-time taken-site check built in step 04.
- [x] Unit tests with hand-built fixtures: square landuse with a building hole inside,
      fully-covered polygon (expect feature dropped), sliver discarded, invalid ring skipped,
      tag classification cases (including wood/water/park classified as taken).

## Implementation notes

- Turf 7: `difference`/`union` may return `null` — handle it, do not assume a geometry.
- The result must stay a pure function: no fetches, no map objects, deterministic output.
- Memory/perf: a dense city bbox can return thousands of polygons; the bbox pre-filter keeps
  the expensive `union` calls near zero for most landuse polygons.

## Exit criteria

- [x] Given a small fixture bbox, `computeFreeLand` output is exactly the expected GeoJSON.
- [x] All unit tests green; geometry has zero React/DOM imports.
- [x] lint / typecheck / test / build all green.

## Files touched

`src/lib/geometry.ts`, `src/lib/geometry.test.ts` (fixtures), possibly `types/geo.ts`.
