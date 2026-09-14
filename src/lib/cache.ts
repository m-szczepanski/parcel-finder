import type { RawOsmFeatureCollection, ViewportBounds } from '@/types/geo';

const cache = new Map<string, RawOsmFeatureCollection>();
const GRID_SIZE = 0.01;
const SNAP_TOLERANCE = 1e-9;
const MAX_CACHE_ENTRIES = 50;

function snapDown(value: number): number {
  return Math.floor(value / GRID_SIZE + SNAP_TOLERANCE) * GRID_SIZE;
}

function snapUp(value: number): number {
  return Math.ceil(value / GRID_SIZE - SNAP_TOLERANCE) * GRID_SIZE;
}

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
