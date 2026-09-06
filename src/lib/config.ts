import type { LandUseType } from '@/types/geo';

// Below this zoom the viewport bbox grows city-wide and Overpass responses get
// too heavy/slow. Measured on a dense city viewport (Warsaw centre): zoom 13 =
// 166 MiB / 150k elements / ~17 s, zoom 14 = 62 MiB / 53k / ~6 s, zoom 15 =
// 25 MiB / 19k / ~3 s; zoom 16 was fast but hides too much for exploring.
export const MIN_ZOOM = 15;

// Landuse remainders smaller than this (m²) are slivers from imprecise OSM
// tracing/building subtraction, not real plots — at the MIN_ZOOM gate (~2.9 m/px
// in Warsaw) 100 m² is already only ~3 px, anything smaller is unclickable dot
// noise (1,400 such candidates measured per dense-city viewport).
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

// Product decision (app doc section 8): forests, water, parks/protected areas,
// cemeteries and quarries are taken and never become free-land candidates.
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
