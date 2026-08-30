# 01 — Map view

**Depends on:** nothing (first step)
**Status:** not started

## Goal

Replace the placeholder `App.tsx` with the real layout: a full-screen Leaflet map rendering
OpenStreetMap tiles plus a sidebar shell. This completes Milestone 1 ("Skeleton") from the
app documentation, which is currently only partially true — deps are wired but no map renders.

## Current state

- `leaflet`, `react-leaflet@5`, `@types/leaflet` installed; `leaflet/dist/leaflet.css` already
  imported in `src/main.tsx`.
- `src/styles/globals.css` has `.leaflet-container` sizing/dark background overrides.
- `src/components/map/` exists and is empty; `App.tsx` renders a static placeholder card.
- Dark mode is enabled via `<html class="dark">`.

## Tasks

- [ ] `src/components/map/MapView.tsx`: `MapContainer` (react-leaflet v5) centered on a default
      location (e.g. Warsaw, `52.23, 21.01`, zoom 15) with an OSM `TileLayer`.
- [ ] OSM attribution string on the tile layer (required by OSM usage policy):
      `&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors`.
- [ ] Grab the `L.Map` instance via the `ref` prop (react-leaflet v5 API) and expose it so
      `useViewportData` (step 02) can read bounds/zoom later.
- [ ] App layout: map fills the viewport; sidebar shell (fixed panel on the right, `w-80`-ish)
      rendered from `src/components/sidebar/` (placeholder content is fine until step 05).
- [ ] Persist last map center/zoom to `localStorage` and restore on load (docs: "last known /
      default location"); fall back to the default location when absent.
- [ ] Verify StrictMode double-mount does not produce "Map container is already initialized"
      (react-leaflet v5 handles this; confirm explicitly).

## Implementation notes

- react-leaflet v5 requires React 19 — already satisfied.
- `MapContainer` needs an explicitly sized ancestor; `globals.css` already gives
  `.leaflet-container` `height: 100%` — make sure the wrapper chain does too.
- No new dependencies needed.
- Testing caveat: Leaflet needs real layout, which `happy-dom` fakes poorly. Keep the component
  test to "renders without crashing" or skip it; real verification is manual/`npm run dev`.

## Exit criteria

- [ ] `npm run dev` shows a pan/zoomable OSM map in dark-themed chrome with attribution visible.
- [ ] Reloading the app restores the last map position.
- [ ] lint / typecheck / test / build all green.

## Files touched

`src/components/map/MapView.tsx` (new), `src/App.tsx`, `src/components/sidebar/` (placeholder),
possibly `src/styles/globals.css`.
