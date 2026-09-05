import type { RawOsmFeatureCollection, ViewportBounds } from '@/types/geo';

const cache = new Map<string, RawOsmFeatureCollection>();

// ~0.01° grid (docs section 3.4): bboxes snapping to the same cells share one
// cache entry, so small pans reuse data instead of refetching.
const GRID_SIZE = 0.01;

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
  cache.set(makeCacheKey(bounds), data);
}

export function clearViewportCache(): void {
  cache.clear();
}
