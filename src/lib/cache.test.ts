import {
  clearViewportCache,
  getCachedViewportData,
  makeCacheKey,
  setCachedViewportData,
} from './cache';

describe('viewport cache', () => {
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
    clearViewportCache();
    const bounds = { south: 52.221, west: 21.034, north: 52.227, east: 21.038 };
    const nearby = { south: 52.224, west: 21.036, north: 52.229, east: 21.039 };
    const data = { type: 'FeatureCollection' as const, features: [] };

    expect(makeCacheKey(bounds)).toBe(makeCacheKey(nearby));

    setCachedViewportData(bounds, data);

    expect(getCachedViewportData(nearby)).toBe(data);
  });

  it('clears all entries', () => {
    const bounds = { south: 1, west: 2, north: 3, east: 4 };
    const data = { type: 'FeatureCollection' as const, features: [] };

    setCachedViewportData(bounds, data);
    clearViewportCache();

    expect(getCachedViewportData(bounds)).toBeNull();
  });
});
