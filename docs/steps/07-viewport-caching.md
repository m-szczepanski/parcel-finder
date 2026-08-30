# 07 — Viewport caching

**Depends on:** 02 (fetch pipeline to cache)
**Status:** not started

## Goal

Stop refetching when the user pans within the same area. The cache stub exists but currently
keys on the exact bbox, so any 1-pixel pan misses — the tech doc (section 3.4) specifies
grid-snapped keys instead.

## Current state

- `src/lib/cache.ts`: working `Map`-backed cache with `makeCacheKey` using raw coordinates
  (tested, but the key strategy is wrong per docs).
- `useViewportData` fetches the exact viewport bbox on every settled move.

## Tasks

- [ ] Snap bboxes to a ~0.01-degree grid: `makeCacheKey` rounds each edge; `useViewportData`
      fetches the **snapped** bbox (not the raw viewport) so cache hits are exact.
- [ ] Bounded cache: cap at ~50 entries, evict oldest via insertion order (`Map` iteration);
      prevents unbounded memory on a long session.
- [ ] Keep `clearViewportCache` exposed for a future manual "refresh area" action (not built
      in this step).
- [ ] Extend cache tests: two nearby bboxes inside one grid cell share a key; eviction
      respects the cap.

## Implementation notes

- In-memory only for v1 (resets on reload) — matches docs; IndexedDB persistence is a later
  option, not now (minimal deps / simplicity).
- TTL intentionally omitted (docs section 3.4): OSM landuse/building data changes slowly for a
  personal tool.

## Exit criteria

- [ ] Panning slightly within the same area produces zero network requests.
- [ ] Crossing a grid boundary refetches only the new area.
- [ ] Cache tests green including eviction.
- [ ] lint / typecheck / test / build all green.

## Files touched

`src/lib/cache.ts`, `src/lib/cache.test.ts`, `src/hooks/useViewportData.ts`.
