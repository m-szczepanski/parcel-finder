import type { LandUseType } from '@/types/geo';

// Below this zoom the viewport bbox grows city-wide and Overpass responses get
// too heavy/slow; 13 is the widest zoom that stayed responsive.
export const MIN_ZOOM = 13;

// Landuse remainders smaller than this (m²) are slivers from imprecise OSM
// tracing, not real plots — rendering them just adds noise.
export const MIN_AREA_M2 = 50;

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

// Maps OSM tag values to LandUseType; classifyLandUse checks tag keys in order
// (landuse, natural, leisure, boundary) and falls back to 'unknown'.
export const LAND_USE_TAG_MAP: Record<string, Record<string, LandUseType>> = {
  landuse: {
    residential: 'residential',
    commercial: 'commercial',
    industrial: 'industrial',
    farmland: 'farmland',
    allotments: 'farmland',
    orchard: 'farmland', // agricultural production, same class as farmland
    grass: 'grass',
    meadow: 'grass',
    village_green: 'grass',
    cemetery: 'cemetery', // maintained burial grounds — not developable
    quarry: 'quarry', // active extraction site — not unused land
  },
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
};

// Product decision (app doc section 8): forests, water, parks/protected areas,
// cemeteries and quarries are taken and never become free-land candidates.
export const TAKEN_LAND_USE_TYPES: ReadonlySet<LandUseType> = new Set([
  'forest',
  'water',
  'park',
  'cemetery',
  'quarry',
]);
