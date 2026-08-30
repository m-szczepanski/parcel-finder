# 01 — Map view

**Depends on:** nothing (first step)
**Status:** done

## Goal

Replace the placeholder `App.tsx` with the real layout: a full-screen Leaflet map rendering
OpenStreetMap tiles plus a placeholder slot for the step-05 side panel. This completes
Milestone 1 ("Skeleton") from the app documentation, which is currently only partially true —
deps are wired but no map renders.

## Current state

- `leaflet`, `react-leaflet@5`, `@types/leaflet` installed; `leaflet/dist/leaflet.css` already
  imported in `src/main.tsx`.
- `src/styles/globals.css` has `.leaflet-container` sizing/dark background overrides.
- `src/components/map/` exists and is empty; `App.tsx` renders a static placeholder card.
- Dark mode is enabled via `<html class="dark">`.

## Tasks

- [x] `src/components/map/MapView.tsx`: `MapContainer` (react-leaflet v5) centered on a default
      location (e.g. Warsaw, `52.23, 21.01`, zoom 15) with an OSM `TileLayer`.
- [x] OSM attribution string on the tile layer (required by OSM usage policy):
      `&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors`.
- [x] Grab the `L.Map` instance via the `ref` prop (react-leaflet v5 API) and expose it so
      `useViewportData` (step 02) can read bounds/zoom later.
- [x] App layout: map fills the viewport; leave a placeholder slot where the step-05 side panel
      will live (the final panel is a click-driven `Sheet` sliding in from the right, so this
      shell is expected to be replaced or removed in step 05).
- [x] Persist last map center/zoom to `localStorage` and restore on load as a fallback
      (docs: "last known / default location").
- [x] On load, request browser geolocation (`navigator.geolocation.getCurrentPosition`, short
      timeout, denial handled silently): if permitted, center the map on the user's location;
      otherwise fall back to last-known (localStorage), then the Warsaw default.
      (A "regional default" beyond this chain is out of scope for v1; revisit if wanted.)
- [x] Verify StrictMode double-mount does not produce "Map container is already initialized"
      (react-leaflet v5 handles this; confirm explicitly).

## Implementation notes

- react-leaflet v5 requires React 19 — already satisfied.
- `MapContainer` needs an explicitly sized ancestor; `globals.css` already gives
  `.leaflet-container` `height: 100%` — make sure the wrapper chain does too.
- No new dependencies needed.
- Testing caveat: Leaflet needs real layout, which `happy-dom` fakes poorly. Keep the component
  test to "renders without crashing" or skip it; real verification is manual/`npm run dev`.

## Exit criteria

- [x] `npm run dev` shows a pan/zoomable OSM map in dark-themed chrome with attribution visible.
- [x] With geolocation permitted, the map centers on the user's location on load.
- [x] With geolocation denied/unavailable, the last position is restored; with no history, the
      map opens on Warsaw.
- [x] lint / typecheck / test / build all green.

## Files touched

`src/components/map/MapView.tsx` (new), `src/App.tsx`, `src/components/sidebar/` (placeholder),
possibly `src/styles/globals.css`.
