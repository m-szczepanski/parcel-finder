import type { RawOsmFeatureCollection, ViewportBounds } from '@/types/geo';

const cache = new Map<string, RawOsmFeatureCollection>();

// ~0.01° grid (docs section 3.4): bboxes snapping to the same cells share one
// cache entry, so small pans reuse data instead of refetching.
const GRID_SIZE = 0.01;

// Keeps memory bounded on long sessions; the oldest area is dropped first.
export const MAX_CACHE_ENTRIES = 50;

function snapEdge(value: number, round: (scaled: number) => number): number {
  return round(value / GRID_SIZE) * GRID_SIZE;
}

// Floor for the lower edges and ceil for the upper ones so the snapped bbox
// always contains the raw viewport.
export function snapBounds(bounds: ViewportBounds): ViewportBounds {
  return {
    south: snapEdge(bounds.south, Math.floor),
    west: snapEdge(bounds.west, Math.floor),
    north: snapEdge(bounds.north, Math.ceil),
    east: snapEdge(bounds.east, Math.ceil),
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
  const key = makeCacheKey(bounds);
  // Re-inserting refreshes the entry's position so a refetched area is not the
  // next one evicted.
  cache.delete(key);
  while (cache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey === undefined) break;
    cache.delete(oldestKey);
  }
  cache.set(key, data);
}

export function clearViewportCache(): void {
  cache.clear();
}
