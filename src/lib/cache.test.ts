import { clearViewportCache, getCachedViewportData, setCachedViewportData } from './cache';

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

  it('clears all entries', () => {
    const bounds = { south: 1, west: 2, north: 3, east: 4 };
    const data = { type: 'FeatureCollection' as const, features: [] };

    setCachedViewportData(bounds, data);
    clearViewportCache();

    expect(getCachedViewportData(bounds)).toBeNull();
  });
});
