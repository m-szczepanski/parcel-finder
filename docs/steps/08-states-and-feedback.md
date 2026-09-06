# 08 — States and feedback

**Depends on:** 02-05 (the full loop whose failure modes need surfacing)
**Status:** done

## Decision (task 4)

The side panel only opens on selection, so "no candidate land" is surfaced as a
non-blocking centered **map overlay** ("Nothing found in this area") rather than a
new always-visible panel. Shares the `MapOverlay` component with the loading badge
and below-min-zoom hint. The panel-styled `EmptyState` component stays unused for now.

## Goal

Implement every row of the tech doc's error/edge-case table (section 5) as actual UI:
toasts on failure, loading feedback, zoom hint, and distinct empty states.

## Current state

- `useViewportData` returns `{ data, loading, error, belowMinZoom }` (after step 02).
- shadcn `sonner` component generated but `<Toaster />` not mounted anywhere yet.
- `EmptyState.tsx` (step 05) has the no-selection variant.

## Tasks

- [x] Mount `<Toaster />` (sonner) in `App` and fire `toast.error` when an Overpass fetch fails,
      keeping the last successful layer visible (no blank map on failure).
- [x] Loading indicator: small spinner/badge overlaid on the map (or panel header) while
      `loading` is true — must not block interaction.
- [x] Below-min-zoom hint: centered overlay "zoom in to see candidate sites" when
      `belowMinZoom`; free-land layer hidden (handled in step 04).
- [x] Map overlay "no candidate land in this area" (decision above) — distinct from "nothing
      selected" so the user can tell data-absence from inaction.
- [x] Rate-limit handling: on repeated failures surface a calmer message suggesting waiting,
      rather than error-spamming (simple failure counter + exponential backoff).

## Implementation notes

- Exponential backoff (tech doc section 5) — minimal version: after a failure, automatic
  refetches are skipped for `min(2s * 2^(failures-1), 30s)`; the next user pan retries naturally.
  `failures` (consecutive count) is exposed and resets on the first success.
- No new dependencies; sonner is already installed.

## Exit criteria

- [x] Killing the network (devtools offline) shows a toast, keeps the old layer, and recovers
      on the next successful pan.
- [x] Below min zoom the hint shows and no requests fire.
- [x] lint / typecheck / test / build all green.

## Files touched

`src/App.tsx`, `src/hooks/useViewportData.ts`, `src/components/sidebar/EmptyState.tsx`,
new small overlay component in `src/components/map/`.
