# 12 — Taken sites on the map

**Depends on:** 03-05 (computed geometry, interactive layer, panel)
**Status:** done

## Goal

Make taken sites visible on the map so occupied ground can't be mistaken for free land:
everything taken renders **red**, and a landuse polygon that contains buildings is taken as a
whole — it must never appear as a green "empty, free to take" remainder. Clicking a taken site
still opens the panel stating the site is taken (already built in step 05 — no panel work here).

## Problem (current state)

- Only empty candidates render (`FreeLandLayer`, green). The raw taken features from the
  step-02 fetch are kept in memory (the `takenFeatures` prop on `MapView`) but never drawn —
  the basemap is the only cue for what is occupied.
- A landuse polygon containing buildings gets the footprints punched out (step 03) and the
  **remainder renders green as a free candidate** — a parcel with a house on it still reads as
  "empty, free to take".
- Clicking a taken site already works (map-level check, tech doc section 3.7) and the panel
  shows the "Taken site" notice with its properties.

## Product decision (to sync into app doc section 8 at step 11)

A site with buildings on it is **taken** — the whole polygon, not just the building footprint:

- A landuse polygon containing at least one building no longer produces a green remainder;
  it is classified taken and rendered red, like the buildings themselves.
- Simple and conservative by design: a single barn marks the whole field taken. If that proves
  too aggressive in practice, revisit with a coverage threshold (e.g. share of the polygon area
  built) during step 10 heuristics tuning, and record the outcome in section 8.

## Tasks

- [x] `src/components/map/TakenSiteLayer.tsx`: react-leaflet `<GeoJSON>` rendering the raw
      taken features (`takenFeatures` — buildings, forest, water, parks **plus** landuse
      polygons promoted by the classification change below) in red: subtle fill (~0.15
      opacity) with a visible border, mirroring `FreeLandLayer`'s green values. Respect the
      same `belowMinZoom` gate as the free-land layer and the remount `key={dataVersion}`
      pattern.
- [x] Render order: taken layer below the free-land layer so green candidates stay on top
      where polygons are adjacent.
- [x] Geometry: in `computeFreeLand`, drop landuse polygons that contain buildings from the
      candidates (no difference/hole operation for them) and add those polygons to the taken
      output collection so they render red. Keep the rest of the pipeline unchanged; update
      the unit tests/fixtures (a "landuse with building hole" fixture becomes a taken polygon).
- [x] Taken-layer click selects the feature with `status: 'taken'` via the same selection
      context and propagation stop as `FreeLandLayer` clicks. Hover on taken sites stays a
      no-op (product decision: taken sites get no hover effect).
- [x] Retire or keep the bare-map `TakenSiteCheck` (tech doc section 3.7): once every taken
      feature is rendered and clickable it is redundant — remove it only after verifying
      coverage (multipolygon relations, mixed tag combos) leaves no clickable gap.
      Removed: the query fetches closed ways only (relations are skipped in the mapper), and
      every raw feature lands in exactly one bucket — building, classified-taken landuse,
      built-on landuse, or green candidate (slivers were unclickable before too) — so no
      clickable gap remains. A bare-map click now just deselects.
- [x] Sync the product decision into `docs/parcel-finder-app-documentation.md` section 8
      (ground rules: as part of step 11).

## Implementation notes

- No new data or queries: `useViewportData` already returns the raw taken features.
- Red palette suggestion: Tailwind red-600 stroke / red-500 fill at the same opacities as the
  green layer, so the pair reads consistently.
- Overlapping taken features (a building inside a forest) both render red — acceptable.
- Dropping the difference step for built-on polygons also removes Turf calls there — slightly
  cheaper geometry, not the motivation.

## Exit criteria

- [x] Buildings, forest, water and parks render red; a landuse polygon with a building on it
      is red (or absent) — never green with a hole.
- [x] Clicking any red site opens the panel with the taken notice; a bare-map click still
      closes the panel.
- [x] No hover effect on taken sites; empty sites behave exactly as before.
- [x] lint / typecheck / test / build all green.

## Files touched

`src/components/map/TakenSiteLayer.tsx` (new), `src/components/map/MapView.tsx`,
`src/lib/geometry.ts` + tests, `src/components/map/MapView.test.tsx`.
