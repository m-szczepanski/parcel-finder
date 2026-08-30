import { normalizeViewportBounds } from './geometry';

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
