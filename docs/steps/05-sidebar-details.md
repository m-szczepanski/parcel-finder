# 05 — Sidebar details

**Depends on:** 04 (hover state to display)
**Status:** not started

## Goal

Build the sidebar data panel: show details of the hovered/pinned site, with explicit empty
states. Completes the interaction loop and Milestone 4.

## Current state

- shadcn `card`, `sheet`, `toggle`, `tooltip`, `button`, `sonner` generated in
  `src/components/ui/`; `cn` helper in `lib/utils.ts`.
- `src/components/sidebar/` is empty; `useHoveredFeature` context ready.
- `CandidateSiteProperties` (`landuseType`, `area`, `centroid`, `address?`) defined in
  `types/geo.ts`.

## Tasks

- [ ] `SiteDetails.tsx` (shadcn `Card`): land-use type (humanized), area formatted, centroid
      coordinates, link to OSM (`https://www.openstreetmap.org/{id}` where id is `way/123`).
- [ ] `formatArea(m2)` helper in `lib/` — `m²` under 10 000, hectares above; `Intl.NumberFormat`,
      no new deps. Unit test it.
- [ ] `EmptyState.tsx`: "Hover over the map to inspect a site" (and a second variant for
      "nothing found in this area" used by step 08).
- [ ] Replace the placeholder sidebar shell from step 01 with a real component tree.
- [ ] Wrap the app in `HoveredFeatureProvider` (App-level) and consume via `useHoveredFeature`.
- [ ] Fixed disclaimer line at the bottom of the sidebar: heuristic approximation, not a
      cadastral/legal source (docs section 1 requires this to be visible).

## Implementation notes

- Desktop-first (web-only non-goal for native), but the sidebar should not break at tablet
  widths; a `Sheet` overlay variant can come later if needed.
- The `address?` field stays unpopulated — Nominatim geocoding is deferred (see step index,
  deferred ideas); render the row only when data exists.

## Exit criteria

- [ ] Hovering a polygon updates the sidebar; moving off resets to the empty state.
- [ ] Area formatting covered by a unit test.
- [ ] Disclaimer visible whenever site details are shown.
- [ ] lint / typecheck / test / build all green.

## Files touched

`src/components/sidebar/SiteDetails.tsx`, `src/components/sidebar/EmptyState.tsx` (new),
`src/App.tsx`, `src/lib/format.ts` (new) + test.
