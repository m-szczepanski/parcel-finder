import { buildOverpassQuery } from './overpass';

describe('buildOverpassQuery', () => {
  it('embeds the bounding box as south,west,north,east', () => {
    const query = buildOverpassQuery({ south: 52.1, west: 21.05, north: 52.2, east: 21.15 });

    expect(query).toContain('(52.1,21.05,52.2,21.15)');
  });

  it('queries building, landuse, natural and leisure tags', () => {
    const query = buildOverpassQuery({ south: 0, west: 0, north: 1, east: 1 });

    expect(query).toContain('way["building"]');
    expect(query).toContain('way["landuse"]');
    expect(query).toContain('way["natural"]');
    expect(query).toContain('way["leisure"]');
  });
});
