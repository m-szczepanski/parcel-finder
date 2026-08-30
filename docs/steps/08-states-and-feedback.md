# 08 — States and feedback

**Depends on:** 02-05 (the full loop whose failure modes need surfacing)
**Status:** not started

## Goal

Implement every row of the tech doc's error/edge-case table (section 5) as actual UI:
toasts on failure, loading feedback, zoom hint, and distinct empty states.

## Current state

- `useViewportData` returns `{ data, loading, error, belowMinZoom }` (after step 02).
- shadcn `sonner` component generated but `<Toaster />` not mounted anywhere yet.
- `EmptyState.tsx` (step 05) has the no-selection variant.

## Tasks

- [ ] Mount `<Toaster />` (sonner) in `App` and fire `toast.error` when an Overpass fetch fails,
      keeping the last successful layer visible (no blank map on failure).
- [ ] Loading indicator: small spinner/badge overlaid on the map (or panel header) while
      `loading` is true — must not block interaction.
- [ ] Below-min-zoom hint: centered overlay "zoom in to see candidate sites" when
      `belowMinZoom`; free-land layer hidden (handled in step 04).
- [ ] Side panel empty-state variant for "no candidate land in this area" — distinct from
      "nothing selected" so the user can tell data-absence from inaction.
- [ ] Rate-limit handling: on repeated failures surface a calmer message suggesting waiting,
      rather than error-spamming (simple failure counter is enough).

## Implementation notes

- Exponential backoff (tech doc section 5) — implement the minimal version: skip the automatic
  refetch for N seconds after a failure; the next user pan retries naturally.
- No new dependencies; sonner is already installed.

## Exit criteria

- [ ] Killing the network (devtools offline) shows a toast, keeps the old layer, and recovers
      on the next successful pan.
- [ ] Below zoom 15 the hint shows and no requests fire.
- [ ] lint / typecheck / test / build all green.

## Files touched

`src/App.tsx`, `src/hooks/useViewportData.ts`, `src/components/sidebar/EmptyState.tsx`,
new small overlay component in `src/components/map/`.
