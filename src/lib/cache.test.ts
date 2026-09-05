import {
  clearViewportCache,
  getCachedViewportData,
  makeCacheKey,
  MAX_CACHE_ENTRIES,
  setCachedViewportData,
} from './cache';

describe('viewport cache', () => {
  beforeEach(() => {
    clearViewportCache();
  });

  it('stores and retrieves data by bbox key', () => {
    const bounds = { south: 1, west: 2, north: 3, east: 4 };
    const data = { type: 'FeatureCollection' as const, features: [] };

    setCachedViewportData(bounds, data);

    expect(getCachedViewportData(bounds)).toBe(data);
  });

  it('returns null for uncached bounds', () => {
    expect(getCachedViewportData({ south: 9, west: 9, north: 9, east: 9 })).toBeNull();
  });

  it('reuses one entry for nearby bboxes within the same grid cells', () => {
    const bounds = { south: 52.221, west: 21.034, north: 52.227, east: 21.038 };
    const nearby = { south: 52.224, west: 21.036, north: 52.229, east: 21.039 };
    const data = { type: 'FeatureCollection' as const, features: [] };

    expect(makeCacheKey(bounds)).toBe(makeCacheKey(nearby));

    setCachedViewportData(bounds, data);

    expect(getCachedViewportData(nearby)).toBe(data);
  });

  it('evicts the oldest entry once the cache exceeds the cap', () => {
    const data = { type: 'FeatureCollection' as const, features: [] };
    const boundsAt = (i: number) => ({ south: i, west: i, north: i + 0.5, east: i + 0.5 });

    for (let i = 0; i < MAX_CACHE_ENTRIES; i += 1) {
      setCachedViewportData(boundsAt(i), data);
    }
    expect(getCachedViewportData(boundsAt(0))).toBe(data);

    setCachedViewportData(boundsAt(MAX_CACHE_ENTRIES), data);

    expect(getCachedViewportData(boundsAt(0))).toBeNull();
    expect(getCachedViewportData(boundsAt(1))).toBe(data);
    expect(getCachedViewportData(boundsAt(MAX_CACHE_ENTRIES))).toBe(data);
  });

  it('clears all entries', () => {
    const bounds = { south: 1, west: 2, north: 3, east: 4 };
    const data = { type: 'FeatureCollection' as const, features: [] };

    setCachedViewportData(bounds, data);
    clearViewportCache();

    expect(getCachedViewportData(bounds)).toBeNull();
  });
});
