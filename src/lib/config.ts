import type { LandUseType } from '@/types/geo';

export const MIN_ZOOM = 15;
export const MIN_AREA_M2 = 100;
export type QueryTag = { key: string; values?: readonly string[] };

export const QUERY_TAGS: readonly QueryTag[] = [
  { key: 'building' },
  { key: 'landuse' },
  { key: 'natural', values: ['wood', 'water', 'scrub', 'grass', 'meadow', 'heath'] },
  { key: 'leisure', values: ['park'] },
  { key: 'boundary', values: ['protected_area'] },
];

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
    orchard: 'farmland',
    plant_nursery: 'farmland',
    grass: 'grass',
    meadow: 'grass',
    village_green: 'grass',
    flowerbed: 'grass',
    brownfield: 'brownfield',
    cemetery: 'cemetery',
    quarry: 'quarry',
    forest: 'forest',
    railway: 'railway',
    construction: 'construction',
    education: 'education',
    religious: 'religious',
    garages: 'garages',
    recreation_ground: 'recreation',
    military: 'military',
  },
};

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
