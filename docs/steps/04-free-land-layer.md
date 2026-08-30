# 04 — Free-land layer

**Depends on:** 02 + 03 (data + computed polygons)
**Status:** not started

## Goal

Render the computed "candidate free land" polygons on the map and make them interactive
(hover highlight, click select). Implements the map half of Milestone 4 (interaction).

## Current state

- `src/components/map/` is empty; `FreeLandLayer.tsx` does not exist.
- `useHoveredFeature` provider works (fixed during review) and exposes
  `hoveredFeature` / `setHoveredFeature` via context — built for the old hover-driven sidebar;
  this step renames/repurposes it to click-driven selection (see tasks).
- Theme tokens available: `--primary` (emerald), `--accent` (amber) in `globals.css`.

## Tasks

- [ ] `src/components/map/FreeLandLayer.tsx`: react-leaflet `<GeoJSON>` rendering the
      FeatureCollection from `useViewportData`.
- [ ] Default style (subtle green fill, ~0.15 opacity, visible border) and hover style —
      **transparent gray** fill + gray borders (product spec; e.g. Tailwind `gray-400` /
      theme `muted-foreground`) — as plain style objects/functions.
- [ ] `onEachFeature`: `mouseover` -> apply the gray hover style; `mouseout` -> revert. Hover is
      style-only — it must not touch shared state or the panel (product decision: the panel
      opens on click).
- [ ] Click to select: `click` on an empty polygon stores the feature via the selection context
      (opens the side panel, built in step 05) and stops propagation; the selected polygon keeps
      the gray style until deselected.
- [ ] Map-level taken-site check (tech doc section 3.7): on a map click that no polygon layer
      consumed, run `turf.booleanPointInPolygon` against the cached raw building/taken polygons;
      on a hit, select that feature with `status: 'taken'` (panel shows the taken notice); on a
      miss, clear the selection (closes the panel). Taken sites therefore get no hover effect by
      construction — they are not in the interactive layer.
- [ ] Rename/repurpose the context: `useHoveredFeature` -> `useSelectedFeature` with
      `selectedFeature` / `selectFeature` / `clearSelection` (feature or `null`); update
      `types/geo.ts` (`HoveredFeatureState` -> `SelectedFeatureState`, add `status`).
- [ ] Force re-render when data changes — react-leaflet's `GeoJSON` does not diff in place;
      pass a changing `key` (e.g. data version counter from `useViewportData`).
- [ ] Hide the layer when `belowMinZoom`.

## Implementation notes

- Keep hover state changes cheap: `setStyle` on the layer, not a data re-render.
- If dense areas feel sluggish in SVG, switch the layer to canvas rendering
  (`MapContainer` `preferCanvas`) — measure first, note result in the step PR.
- Do not couple this component to the side panel; the context provider is the only contract.

## Exit criteria

- [ ] Polygons render above zoom 15; hovering empty sites highlights them transparent gray and
      reverts correctly; taken areas (buildings, forest, water) produce no hover effect.
- [ ] Clicking an empty polygon opens the side panel with its data; clicking a taken site opens
      the panel with the taken notice; clicking bare map closes it.
- [ ] lint / typecheck / test / build all green.

## Files touched

`src/components/map/FreeLandLayer.tsx` (new), `src/hooks/useSelectedFeature.tsx` (renamed from
`useHoveredFeature.tsx`), `src/types/geo.ts`, `src/App.tsx` (mount layer inside `MapView`).
