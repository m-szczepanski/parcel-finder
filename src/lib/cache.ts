import type { CandidateSiteFeatureCollection, ViewportBounds } from '@/types/geo';

const cache = new Map<string, CandidateSiteFeatureCollection>();

export function makeCacheKey(bounds: ViewportBounds): string {
  return `${bounds.south}:${bounds.west}:${bounds.north}:${bounds.east}`;
}

export function getCachedViewportData(bounds: ViewportBounds): CandidateSiteFeatureCollection | null {
  return cache.get(makeCacheKey(bounds)) ?? null;
}

export function setCachedViewportData(bounds: ViewportBounds, data: CandidateSiteFeatureCollection): void {
  cache.set(makeCacheKey(bounds), data);
}

export function clearViewportCache(): void {
  cache.clear();
}
