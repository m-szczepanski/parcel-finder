# 06 — Basemap toggle

**Depends on:** 01 (map exists)
**Status:** not started

## Goal

OSM / satellite (Esri World Imagery) switch, as listed in the docs' stack table and
Milestone 5. Small, self-contained UI feature.

## Current state

- shadcn `toggle` (and `button`) components already generated.
- `MapView` from step 01 renders a single hard-coded OSM `TileLayer`.

## Tasks

- [ ] `src/components/map/BasemapToggle.tsx`: two-state control (shadcn `Toggle` or a small
      segmented pair of `Button`s) floating over the map corner (absolute positioning).
- [ ] Switch `TileLayer` `url` + `attribution` between: - OSM standard (as in step 01); - Esri World Imagery:
      `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}`
      with Esri attribution (Esri requires attribution too — keep it visible).
- [ ] Remount the tile layer on switch (changing `key`) — react-leaflet does not hot-swap URLs.
- [ ] Persist the choice in `localStorage` alongside the map position from step 01.

## Implementation notes

- No new dependencies.
- Satellite mode is the "visual sanity check" for whether land is really empty (docs section 5,
  data sources) — the toggled state default stays OSM.

## Exit criteria

- [ ] Toggle flips basemaps instantly with correct attribution in both modes.
- [ ] Choice survives a reload.
- [ ] lint / typecheck / test / build all green.

## Files touched

`src/components/map/BasemapToggle.tsx` (new), `src/components/map/MapView.tsx`.
