# 05 — Side panel

**Depends on:** 04 (hover state to display)
**Status:** not started

## Goal

Build the side panel: a shadcn `Sheet` sliding in from the right when the user clicks a site,
showing its calculated properties — with a clear "taken" notice for taken sites — plus explicit
empty states. Completes the interaction loop and Milestone 4.

## Current state

- shadcn `card`, `sheet`, `toggle`, `tooltip`, `button`, `sonner` generated in
  `src/components/ui/`; `cn` helper in `lib/utils.ts`.
- `src/components/sidebar/` is empty; selection context ready after step 04's rename
  (`useSelectedFeature`).
- `CandidateSiteProperties` (`landuseType`, `area`, `centroid`, `address?`) defined in
  `types/geo.ts`; features carry `status: 'empty' | 'taken'` from steps 03/04.

## Tasks

- [ ] `SiteDetails.tsx` (shadcn `Sheet`, `side="right"`): opens on selection; land-use type
      (humanized), area formatted, centroid coordinates, link to OSM
      (`https://www.openstreetmap.org/{id}` where id is `way/123`).
- [ ] Taken-site presentation: when the selected feature has `status: 'taken'`, show a clear
      "taken" notice (e.g. badge naming what occupies it — building / forest / water, from tags)
      above the same property rows; properties that exist are still displayed.
- [ ] `formatArea(m2)` helper in `lib/` — `m²` under 10 000, hectares above; `Intl.NumberFormat`,
      no new deps. Unit test it.
- [ ] `EmptyState.tsx`: "Click a site on the map to inspect it" (and a second variant for
      "nothing found in this area" used by step 08).
- [ ] Replace the placeholder sidebar shell from step 01 with the click-driven `Sheet` (the
      permanent panel goes away; the map becomes the full-screen surface).
- [ ] Wrap the app in `SelectedFeatureProvider` (App-level) and consume via
      `useSelectedFeature`; opening/closing the `Sheet` is driven by the selection state
      (background click deselects, per step 04).
- [ ] Fixed disclaimer line at the bottom of the panel: heuristic approximation, not a
      cadastral/legal source (docs section 1 requires this to be visible).

## Implementation notes

- Desktop-first (web-only non-goal for native), but the panel should not break at tablet widths.
- The `address?` field stays unpopulated — Nominatim geocoding is deferred (see step index,
  deferred ideas); render the row only when data exists.

## Exit criteria

- [ ] Clicking a site opens the panel from the right; closing it (background click or X) returns
      to the empty state.
- [ ] An empty site shows its properties; a taken site shows the taken notice plus its available
      properties.
- [ ] Area formatting covered by a unit test.
- [ ] Disclaimer visible whenever site details are shown.
- [ ] lint / typecheck / test / build all green.

## Files touched

`src/components/sidebar/SiteDetails.tsx`, `src/components/sidebar/EmptyState.tsx` (new),
`src/App.tsx`, `src/lib/format.ts` (new) + test.
