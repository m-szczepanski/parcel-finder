import type { RawOsmFeatureCollection, ViewportBounds } from '@/types/geo';

const cache = new Map<string, RawOsmFeatureCollection>();

// ~0.01° grid (docs section 3.4): bboxes snapping to the same cells share one
// cache entry, so small pans reuse data instead of refetching.
const GRID_SIZE = 0.01;

// Absorbs float dust from the /GRID_SIZE division (e.g. 52.25 / 0.01 computing
// to 5225.000000000001) so an already-snapped value re-snaps to itself —
// makeCacheKey re-snaps the bounds the hook snapped for fetching.
const SNAP_TOLERANCE = 1e-9;

// Keeps memory bounded on long sessions; the oldest area is dropped first.
export const MAX_CACHE_ENTRIES = 50;

function snapDown(value: number): number {
  return Math.floor(value / GRID_SIZE + SNAP_TOLERANCE) * GRID_SIZE;
}

function snapUp(value: number): number {
  return Math.ceil(value / GRID_SIZE - SNAP_TOLERANCE) * GRID_SIZE;
}

// Down for the lower edges and up for the upper ones so the snapped bbox
// always contains the raw viewport.
export function snapBounds(bounds: ViewportBounds): ViewportBounds {
  return {
    south: snapDown(bounds.south),
    west: snapDown(bounds.west),
    north: snapUp(bounds.north),
    east: snapUp(bounds.east),
  };
}

export function makeCacheKey(bounds: ViewportBounds): string {
  const snapped = snapBounds(bounds);

  return `${snapped.south}:${snapped.west}:${snapped.north}:${snapped.east}`;
}

export function getCachedViewportData(
  bounds: ViewportBounds,
): RawOsmFeatureCollection | null {
  return cache.get(makeCacheKey(bounds)) ?? null;
}

export function setCachedViewportData(
  bounds: ViewportBounds,
  data: RawOsmFeatureCollection,
): void {
  while (cache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey === undefined) break;
    cache.delete(oldestKey);
  }
  cache.set(makeCacheKey(bounds), data);
}

export function clearViewportCache(): void {
  cache.clear();
}
