import type { Position } from 'geojson';
import type { RawOsmFeature, RawOsmFeatureCollection } from '@/types/geo';
import { MIN_AREA_M2 } from './config';
import {
  computeFreeLand,
  computeViewportSites,
  classifyLandUse,
  normalizeViewportBounds,
} from './geometry';

function ring(west: number, south: number, east: number, north: number): Position[] {
  return [
    [west, south],
    [east, south],
    [east, north],
    [west, north],
    [west, south],
  ];
}

function polygonFeature(id: string, tags: Record<string, string>, outline: Position[]): RawOsmFeature {
  return {
    type: 'Feature',
    id,
    properties: { id, tags },
    geometry: { type: 'Polygon', coordinates: [outline] },
  };
}

function collection(features: RawOsmFeature[]): RawOsmFeatureCollection {
  return { type: 'FeatureCollection', features };
}

// ~1.24M m² square (0.01° per side)
const LANDUSE_RING = ring(0, 0, 0.01, 0.01);
const LANDUSE = polygonFeature('way/land-1', { landuse: 'residential' }, LANDUSE_RING);

describe('computeFreeLand', () => {
  it('subtracts a building footprint from a landuse polygon', () => {
    const building = polygonFeature('way/b-1', { building: 'yes' }, ring(0.003, 0.003, 0.007, 0.007));

    const result = computeFreeLand(collection([LANDUSE]), collection([building]));

    expect(result.features).toHaveLength(1);
    const [feature] = result.features;
    expect(feature.id).toBe('way/land-1');
    expect(feature.properties).toMatchObject({
      id: 'way/land-1',
      landuseType: 'residential',
      status: 'empty',
    });
    expect(feature.properties.area).toBeCloseTo(1_038_605.047, 0);
    expect(feature.properties.area).toBeGreaterThan(MIN_AREA_M2);
    expect(feature.properties.centroid).toEqual([0.005, 0.005]);
    expect(feature.geometry).toEqual({
      type: 'Polygon',
      coordinates: [
        [
          [0, 0],
          [0.01, 0],
          [0.01, 0.01],
          [0, 0.01],
          [0, 0],
        ],
        [
          [0.003, 0.003],
          [0.003, 0.007],
          [0.007, 0.007],
          [0.007, 0.003],
          [0.003, 0.003],
        ],
      ],
    });
  });

  it('keeps a landuse polygon as-is when no building overlaps it', () => {
    const far = polygonFeature('way/b-far', { building: 'yes' }, ring(10, 10, 11, 11));
    const edge = polygonFeature('way/b-edge', { building: 'yes' }, ring(0.009, 0.011, 0.02, 0.02));

    const result = computeFreeLand(collection([LANDUSE]), collection([far, edge]));

    expect(result.features).toHaveLength(1);
    expect(result.features[0].geometry).toEqual({ type: 'Polygon', coordinates: [LANDUSE_RING] });
  });

  it('unions overlapping buildings before subtracting', () => {
    const first = polygonFeature('way/b-1', { building: 'yes' }, ring(0.003, 0.003, 0.007, 0.007));
    const second = polygonFeature('way/b-2', { building: 'yes' }, ring(0.005, 0.002, 0.009, 0.006));

    const result = computeFreeLand(collection([LANDUSE]), collection([first, second]));

    expect(result.features).toHaveLength(1);
    expect(result.features[0].geometry).toEqual({
      type: 'Polygon',
      coordinates: [
        [
          [0, 0],
          [0.01, 0],
          [0.01, 0.01],
          [0, 0.01],
          [0, 0],
        ],
        [
          [0.003, 0.003],
          [0.003, 0.007],
          [0.007, 0.007],
          [0.007, 0.006],
          [0.009, 0.006],
          [0.009, 0.002],
          [0.005, 0.002],
          [0.005, 0.003],
          [0.003, 0.003],
        ],
      ],
    });
  });

  it('drops a landuse polygon fully covered by buildings', () => {
    const cover = polygonFeature('way/b-cover', { building: 'yes' }, ring(-0.01, -0.01, 0.02, 0.02));

    const result = computeFreeLand(collection([LANDUSE]), collection([cover]));

    expect(result.features).toHaveLength(0);
  });

  it('discards slivers below MIN_AREA_M2', () => {
    // ~4.9 m² square (0.00002° per side)
    const tiny = polygonFeature('way/tiny', { landuse: 'grass' }, ring(0, 0, 0.00002, 0.00002));

    const result = computeFreeLand(collection([tiny, LANDUSE]), collection([]));

    expect(result.features).toHaveLength(1);
    expect(result.features[0].id).toBe('way/land-1');
  });

  it('never returns taken land use as candidates', () => {
    const wood = polygonFeature('way/wood', { natural: 'wood' }, ring(0, 0, 0.01, 0.01));
    const water = polygonFeature('way/water', { natural: 'water' }, ring(0, 0, 0.01, 0.01));
    const park = polygonFeature('way/park', { leisure: 'park' }, ring(0, 0, 0.01, 0.01));
    const field = polygonFeature('way/field', { landuse: 'farmland' }, ring(0, 0, 0.01, 0.01));

    const result = computeFreeLand(collection([wood, water, park, field]), collection([]));

    expect(result.features.map((feature) => feature.properties.landuseType)).toEqual(['farmland']);
  });

  it('treats edge categories per policy: orchard empty, cemetery/quarry taken', () => {
    const orchard = polygonFeature('way/orchard', { landuse: 'orchard' }, ring(0, 0, 0.01, 0.01));
    const cemetery = polygonFeature('way/cemetery', { landuse: 'cemetery' }, ring(2, 2, 2.01, 2.01));
    const quarry = polygonFeature('way/quarry', { landuse: 'quarry' }, ring(4, 4, 4.01, 4.01));
    // Co-tagged park: cover/amenity precedence must exclude it despite the grass zoning tag.
    const coTaggedPark = polygonFeature(
      'way/park-grass',
      { landuse: 'grass', leisure: 'park' },
      ring(6, 6, 6.01, 6.01),
    );

    const result = computeFreeLand(
      collection([orchard, cemetery, quarry, coTaggedPark]),
      collection([]),
    );

    expect(result.features.map((feature) => feature.properties.landuseType)).toEqual(['farmland']);
  });

  it('skips an invalid polygon without breaking the batch', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    // Deliberately corrupted ring (non-numeric coordinate) that still has a valid
    // bbox, so the invalid geometry is reached during subtraction.
    const invalid = polygonFeature('way/broken', { landuse: 'residential' }, [
      [0, 'x'],
      [0.01, 0],
      [0.01, 0.01],
      [0, 0],
    ] as unknown as Position[]);
    const building = polygonFeature('way/b-1', { building: 'yes' }, ring(0.003, 0.003, 0.007, 0.007));

    const result = computeFreeLand(collection([LANDUSE, invalid]), collection([building]));

    expect(warn).toHaveBeenCalledOnce();
    expect(warn.mock.calls[0][0]).toContain('way/broken');
    expect(result.features).toHaveLength(1);
    expect(result.features[0].id).toBe('way/land-1');

    warn.mockRestore();
  });
});

describe('classifyLandUse', () => {
  it.each([
    [{ landuse: 'residential' }, 'residential'],
    [{ landuse: 'commercial' }, 'commercial'],
    [{ landuse: 'industrial' }, 'industrial'],
    [{ landuse: 'farmland' }, 'farmland'],
    [{ landuse: 'allotments' }, 'farmland'],
    [{ landuse: 'grass' }, 'grass'],
    [{ landuse: 'village_green' }, 'grass'],
    [{ natural: 'grass' }, 'grass'],
    [{ natural: 'scrub' }, 'grass'],
    [{ natural: 'meadow' }, 'grass'],
    [{ natural: 'heath' }, 'grass'],
    [{ natural: 'wood' }, 'forest'],
    [{ natural: 'water' }, 'water'],
    [{ leisure: 'park' }, 'park'],
    [{ boundary: 'protected_area' }, 'park'],
    [{ landuse: 'orchard' }, 'farmland'],
    [{ landuse: 'plant_nursery' }, 'farmland'],
    [{ landuse: 'cemetery' }, 'cemetery'],
    [{ landuse: 'quarry' }, 'quarry'],
    [{ landuse: 'brownfield' }, 'brownfield'],
    [{ landuse: 'retail' }, 'commercial'],
    [{ landuse: 'flowerbed' }, 'grass'],
    [{ landuse: 'forest' }, 'forest'],
    [{ landuse: 'railway' }, 'railway'],
    [{ landuse: 'construction' }, 'construction'],
    [{ landuse: 'education' }, 'education'],
    [{ landuse: 'religious' }, 'religious'],
    [{ landuse: 'garages' }, 'garages'],
    [{ landuse: 'recreation_ground' }, 'recreation'],
    [{ landuse: 'military' }, 'military'],
  ] as const)('maps %j to %s', (tags, expected) => {
    expect(classifyLandUse(tags)).toBe(expected);
  });

  it.each([
    [{ highway: 'residential' }, 'unknown'],
    [{}, 'unknown'],
  ] as const)('falls back to "unknown" for %j', (tags, expected) => {
    expect(classifyLandUse(tags)).toBe(expected);
  });

  // Physical cover/amenity must beat zoning: a wood or park co-tagged with
  // grass/farmland landuse is still taken (measured: 11 such features in one
  // Warsaw viewport).
  it('prefers physical cover and amenity tags over landuse zoning', () => {
    expect(classifyLandUse({ landuse: 'residential', natural: 'wood' })).toBe('forest');
    expect(classifyLandUse({ landuse: 'grass', leisure: 'park' })).toBe('park');
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

describe('computeViewportSites', () => {
  it('derives free-land candidates and taken features from one split', () => {
    const forest = polygonFeature('way/wood-1', { natural: 'wood' }, ring(0, 0, 0.01, 0.01));
    const meadow = polygonFeature('way/grass-1', { natural: 'meadow' }, ring(2, 2, 2.01, 2.01));
    const building = polygonFeature('way/b-1', { building: 'yes' }, ring(2.003, 2.003, 2.007, 2.007));

    const { freeLand, takenFeatures } = computeViewportSites(collection([forest, building, meadow]));

    // The meadow is the only empty candidate (the building punched a hole into
    // it); the building and the forest stay raw and taken, buildings first.
    expect(freeLand.features.map((feature) => feature.id)).toEqual(['way/grass-1']);
    expect(freeLand.features[0].geometry.coordinates).toHaveLength(2);
    expect(takenFeatures.map((feature) => feature.id)).toEqual(['way/b-1', 'way/wood-1']);
  });

  it('returns empty results for an empty viewport', () => {
    expect(computeViewportSites(collection([]))).toEqual({
      freeLand: { type: 'FeatureCollection', features: [] },
      takenFeatures: [],
    });
  });
});
