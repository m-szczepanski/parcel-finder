import type { LandUseType } from '@/types/geo';

// Below this zoom Overpass responses get too heavy/slow for dense-city
// viewports (measured: 62 MiB / ~6 s at 14 vs 25 MiB / ~3 s at 15); 16 hides
// too much for exploring. Measured comparison: app doc section 8.
export const MIN_ZOOM = 15;

// Remainders below this (m²) are tracing/subtraction slivers, not plots: ~3 px
// wide at the MIN_ZOOM gate, i.e. unclickable dot noise (measured; app doc 8).
export const MIN_AREA_M2 = 100;

// Which OSM tag values the Overpass query fetches. Restricted `values` keep the
// response small: unfiltered natural/leisure queries ballooned it and tripped
// Overpass rate limits.
export type QueryTag = { key: string; values?: readonly string[] };

export const QUERY_TAGS: readonly QueryTag[] = [
  { key: 'building' }, // always taken; subtracted from candidates, never rendered
  { key: 'landuse' }, // primary land-cover/use polygons
  { key: 'natural', values: ['wood', 'water', 'scrub', 'grass', 'meadow', 'heath'] },
  { key: 'leisure', values: ['park'] },
  { key: 'boundary', values: ['protected_area'] },
];

// Maps OSM tag values to LandUseType; classifyLandUse checks tag keys in the
// order defined here and falls back to 'unknown'. Key order matters: physical
// cover/amenity (natural, leisure, boundary) must beat zoning (landuse), so a
// wood or park co-tagged with grass/farmland still classifies taken.
export const LAND_USE_TAG_MAP: Record<string, Record<string, LandUseType>> = {
  natural: {
    wood: 'forest',
    water: 'water',
    grass: 'grass',
    meadow: 'grass',
    scrub: 'grass',
    heath: 'grass',
  },
  leisure: {
    park: 'park',
  },
  boundary: {
    protected_area: 'park',
  },
  landuse: {
    residential: 'residential',
    commercial: 'commercial',
    retail: 'commercial',
    industrial: 'industrial',
    farmland: 'farmland',
    allotments: 'farmland',
    orchard: 'farmland', // agricultural production, same class as farmland
    plant_nursery: 'farmland',
    grass: 'grass',
    meadow: 'grass',
    village_green: 'grass',
    flowerbed: 'grass', // decorative planting; mostly drops out via MIN_AREA_M2
    brownfield: 'brownfield', // policy-named empty: unused ground awaiting redevelopment
    cemetery: 'cemetery', // maintained burial grounds — not developable
    quarry: 'quarry', // active extraction site — not unused land
    forest: 'forest', // same taken class as natural=wood
    railway: 'railway', // transport corridor — in active use
    construction: 'construction', // already being developed
    education: 'education', // institutional grounds — in active use
    religious: 'religious', // church grounds — in active use
    garages: 'garages', // garage colonies — in active use
    recreation_ground: 'recreation', // maintained amenity, park-like
    military: 'military', // restricted — never a candidate
  },
};

// Product decision (app doc section 8, edge categories tuned in step 10): these
// land-use types are taken and never become free-land candidates; buildings are
// subtracted instead.
export const TAKEN_LAND_USE_TYPES: ReadonlySet<LandUseType> = new Set([
  'forest',
  'water',
  'park',
  'cemetery',
  'quarry',
  'railway',
  'construction',
  'education',
  'religious',
  'garages',
  'recreation',
  'military',
]);
