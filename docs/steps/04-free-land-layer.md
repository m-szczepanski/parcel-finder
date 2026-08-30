# 04 — Free-land layer

**Depends on:** 02 + 03 (data + computed polygons)
**Status:** not started

## Goal

Render the computed "candidate free land" polygons on the map and make them interactive
(hover highlight, click select). Implements the map half of Milestone 4 (interaction).

## Current state

- `src/components/map/` is empty; `FreeLandLayer.tsx` does not exist.
- `useHoveredFeature` provider works (fixed during review) and exposes
  `hoveredFeature` / `setHoveredFeature` via context.
- Theme tokens available: `--primary` (emerald), `--accent` (amber) in `globals.css`.

## Tasks

- [ ] `src/components/map/FreeLandLayer.tsx`: react-leaflet `<GeoJSON>` rendering the
      FeatureCollection from `useViewportData`.
- [ ] Default style (subtle green fill, ~0.15 opacity, visible border) and hover style (amber
      accent, stronger fill) as plain style objects/functions.
- [ ] `onEachFeature`: `mouseover` -> apply hover style + `setHoveredFeature(feature)`;
      `mouseout` -> revert style + `setHoveredFeature(null)`.
- [ ] Click to pin: `click` sets the same hovered feature (touch devices have no hover);
      clicking the map background clears it.
- [ ] Force re-render when data changes — react-leaflet's `GeoJSON` does not diff in place;
      pass a changing `key` (e.g. data version counter from `useViewportData`).
- [ ] Hide the layer when `belowMinZoom`.

## Implementation notes

- Keep hover state changes cheap: `setStyle` on the layer, not a data re-render.
- If dense areas feel sluggish in SVG, switch the layer to canvas rendering
  (`MapContainer` `preferCanvas`) — measure first, note result in the step PR.
- Do not couple this component to the sidebar; the context provider is the only contract.

## Exit criteria

- [ ] Polygons render above zoom 15; hovering highlights and reverts correctly.
- [ ] Click selects (stays highlighted) on touch-sized viewports.
- [ ] lint / typecheck / test / build all green.

## Files touched

`src/components/map/FreeLandLayer.tsx` (new), `src/App.tsx` (mount layer inside `MapView`).
