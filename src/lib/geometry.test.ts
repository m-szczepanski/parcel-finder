import { classifyLandUse, normalizeViewportBounds } from './geometry';

describe('classifyLandUse', () => {
  it.each([
    [{ landuse: 'residential' }, 'residential'],
    [{ landuse: 'commercial' }, 'commercial'],
    [{ landuse: 'industrial' }, 'industrial'],
    [{ landuse: 'farmland' }, 'farmland'],
    [{ landuse: 'grass' }, 'grass'],
    [{ natural: 'grass' }, 'grass'],
    [{ natural: 'scrub' }, 'grass'],
    [{ natural: 'meadow' }, 'grass'],
    [{ natural: 'wood' }, 'forest'],
    [{ natural: 'water' }, 'water'],
    [{ leisure: 'park' }, 'park'],
    [{ boundary: 'protected_area' }, 'park'],
  ] as const)('maps %j to %s', (tags, expected) => {
    expect(classifyLandUse(tags)).toBe(expected);
  });

  it.each([
    [{ landuse: 'brownfield' }, 'unknown'],
    [{ highway: 'residential' }, 'unknown'],
    [{}, 'unknown'],
  ] as const)('falls back to "unknown" for %j', (tags, expected) => {
    expect(classifyLandUse(tags)).toBe(expected);
  });

  it('prefers the landuse tag over other tag keys', () => {
    expect(classifyLandUse({ landuse: 'residential', natural: 'wood' })).toBe('residential');
  });
});

describe('normalizeViewportBounds', () => {
  it('returns bounds unchanged when already ordered', () => {
    const bounds = { south: 1, west: 2, north: 3, east: 4 };

    expect(normalizeViewportBounds(bounds)).toEqual(bounds);
  });

  it('swaps inverted south/north and west/east values', () => {
    const bounds = { south: 3, west: 4, north: 1, east: 2 };

    expect(normalizeViewportBounds(bounds)).toEqual({ south: 1, west: 2, north: 3, east: 4 });
  });
});
