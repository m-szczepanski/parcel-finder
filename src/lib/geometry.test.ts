import type { Position } from 'geojson';
import type { RawOsmFeature, RawOsmFeatureCollection } from '@/types/geo';
import {
  computeSites,
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

function polygonFeature(
  id: string,
  tags: Record<string, string>,
  outline: Position[],
): RawOsmFeature {
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

describe('computeSites', () => {
  it('takes a landuse polygon whole when a building sits on it', () => {
    const building = polygonFeature(
      'way/b-1',
      { building: 'yes' },
      ring(0.003, 0.003, 0.007, 0.007),
    );

    const { freeLand, takenLanduse } = computeSites(collection([LANDUSE]), collection([building]));

    expect(freeLand.features).toHaveLength(0);
    // Taken as a whole — the raw polygon, no hole punched out.
    expect(takenLanduse.map((feature) => feature.id)).toEqual(['way/land-1']);
    expect(takenLanduse[0].geometry).toEqual({ type: 'Polygon', coordinates: [LANDUSE_RING] });
  });

  it('keeps a landuse polygon empty when no building overlaps it', () => {
    const far = polygonFeature('way/b-far', { building: 'yes' }, ring(10, 10, 11, 11));
    const edge = polygonFeature('way/b-edge', { building: 'yes' }, ring(0.009, 0.011, 0.02, 0.02));

    const { freeLand } = computeSites(collection([LANDUSE]), collection([far, edge]));

    expect(freeLand.features).toHaveLength(1);
    expect(freeLand.features[0].id).toBe('way/land-1');
    expect(freeLand.features[0].properties).toMatchObject({
      id: 'way/land-1',
      landuseType: 'residential',
      status: 'empty',
      centroid: [0.005, 0.005],
    });
    expect(freeLand.features[0].properties.area).toBeCloseTo(1_236_434.58, 0);
    expect(freeLand.features[0].geometry).toEqual({ type: 'Polygon', coordinates: [LANDUSE_RING] });
  });

  it('takes a landuse polygon fully covered by buildings', () => {
    const cover = polygonFeature(
      'way/b-cover',
      { building: 'yes' },
      ring(-0.01, -0.01, 0.02, 0.02),
    );

    const { freeLand, takenLanduse } = computeSites(collection([LANDUSE]), collection([cover]));

    expect(freeLand.features).toHaveLength(0);
    expect(takenLanduse.map((feature) => feature.id)).toEqual(['way/land-1']);
  });

  it('keeps a landuse polygon empty when the building only shares its bbox', () => {
    // L-shaped polygon with an empty notch in the top-right corner: the
    // building sits inside the notch, so the bboxes intersect but the
    // geometries do not — the polygon must stay a candidate.
    const lShaped = polygonFeature('way/l-shape', { landuse: 'farmland' }, [
      [0, 0],
      [0.01, 0],
      [0.01, 0.008],
      [0.008, 0.008],
      [0.008, 0.01],
      [0, 0.01],
      [0, 0],
    ]);
    const notchBuilding = polygonFeature(
      'way/b-notch',
      { building: 'yes' },
      ring(0.0085, 0.0085, 0.0095, 0.0095),
    );

    const { freeLand, takenLanduse } = computeSites(
      collection([lShaped]),
      collection([notchBuilding]),
    );

    expect(freeLand.features.map((feature) => feature.id)).toEqual(['way/l-shape']);
    expect(takenLanduse).toHaveLength(0);
  });

  it('discards slivers below MIN_AREA_M2', () => {
    // ~4.9 m² square (0.00002° per side)
    const tiny = polygonFeature('way/tiny', { landuse: 'grass' }, ring(0, 0, 0.00002, 0.00002));

    const { freeLand, takenLanduse } = computeSites(collection([tiny, LANDUSE]), collection([]));

    expect(freeLand.features.map((feature) => feature.id)).toEqual(['way/land-1']);
    expect(takenLanduse).toHaveLength(0);
  });

  it('classifies taken land use into the taken output', () => {
    const wood = polygonFeature('way/wood', { natural: 'wood' }, ring(0, 0, 0.01, 0.01));
    const water = polygonFeature('way/water', { natural: 'water' }, ring(0, 0, 0.01, 0.01));
    const park = polygonFeature('way/park', { leisure: 'park' }, ring(0, 0, 0.01, 0.01));
    const field = polygonFeature('way/field', { landuse: 'farmland' }, ring(0, 0, 0.01, 0.01));

    const { freeLand, takenLanduse } = computeSites(
      collection([wood, water, park, field]),
      collection([]),
    );

    expect(freeLand.features.map((feature) => feature.properties.landuseType)).toEqual([
      'farmland',
    ]);
    expect(takenLanduse.map((feature) => feature.id)).toEqual([
      'way/wood',
      'way/water',
      'way/park',
    ]);
  });

  it('treats edge categories per policy: orchard empty, cemetery/quarry taken', () => {
    const orchard = polygonFeature('way/orchard', { landuse: 'orchard' }, ring(0, 0, 0.01, 0.01));
    const cemetery = polygonFeature(
      'way/cemetery',
      { landuse: 'cemetery' },
      ring(2, 2, 2.01, 2.01),
    );
    const quarry = polygonFeature('way/quarry', { landuse: 'quarry' }, ring(4, 4, 4.01, 4.01));
    // Co-tagged park: cover/amenity precedence must exclude it despite the grass zoning tag.
    const coTaggedPark = polygonFeature(
      'way/park-grass',
      { landuse: 'grass', leisure: 'park' },
      ring(6, 6, 6.01, 6.01),
    );

    const { freeLand } = computeSites(
      collection([orchard, cemetery, quarry, coTaggedPark]),
      collection([]),
    );

    expect(freeLand.features.map((feature) => feature.properties.landuseType)).toEqual([
      'farmland',
    ]);
  });

  it('skips an invalid polygon without breaking the batch', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    // Null coordinates tear the bbox measurement up — the try/catch must skip
    // the feature and keep the batch going.
    const invalid = polygonFeature('way/broken', { landuse: 'residential' }, [
      [0, 0],
      [0.01, 0],
      [0.01, 0.01],
      [0, 0],
    ]);
    (invalid.geometry as unknown as { coordinates: null }).coordinates = null;
    const far = polygonFeature('way/b-far', { building: 'yes' }, ring(10, 10, 11, 11));

    const { freeLand, takenLanduse } = computeSites(
      collection([LANDUSE, invalid]),
      collection([far]),
    );

    expect(warn).toHaveBeenCalledOnce();
    expect(warn.mock.calls[0][0]).toContain('way/broken');
    expect(freeLand.features.map((feature) => feature.id)).toEqual(['way/land-1']);
    expect(takenLanduse).toHaveLength(0);

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
    const building = polygonFeature(
      'way/b-1',
      { building: 'yes' },
      ring(2.003, 2.003, 2.007, 2.007),
    );

    const { freeLand, takenFeatures } = computeViewportSites(
      collection([forest, building, meadow]),
    );

    // The built-on meadow is taken as a whole (step-12 product decision), so
    // nothing stays a free candidate; buildings come first in the taken output.
    expect(freeLand.features).toHaveLength(0);
    expect(takenFeatures.map((feature) => feature.id)).toEqual([
      'way/b-1',
      'way/wood-1',
      'way/grass-1',
    ]);
  });

  it('keeps an unbuilt landuse polygon as an empty candidate', () => {
    const forest = polygonFeature('way/wood-1', { natural: 'wood' }, ring(0, 0, 0.01, 0.01));
    const meadow = polygonFeature('way/grass-1', { natural: 'meadow' }, ring(2, 2, 2.01, 2.01));

    const { freeLand, takenFeatures } = computeViewportSites(collection([forest, meadow]));

    expect(freeLand.features.map((feature) => feature.id)).toEqual(['way/grass-1']);
    expect(takenFeatures.map((feature) => feature.id)).toEqual(['way/wood-1']);
  });

  it('returns empty results for an empty viewport', () => {
    expect(computeViewportSites(collection([]))).toEqual({
      freeLand: { type: 'FeatureCollection', features: [] },
      takenFeatures: [],
    });
  });
});
