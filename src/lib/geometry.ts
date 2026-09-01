import type { CandidateSiteFeatureCollection, LandUseType } from '@/types/geo';

// Maps OSM tags to LandUseType. First matching tag key wins (landuse, then natural,
// leisure, boundary). Anything unmapped falls back to 'unknown'. The exclude/include
// policy is tuned in step 10 — keep this table small.
const LAND_USE_TAG_MAP: Record<string, Record<string, LandUseType>> = {
  landuse: {
    residential: 'residential',
    commercial: 'commercial',
    industrial: 'industrial',
    farmland: 'farmland',
    grass: 'grass',
    meadow: 'grass',
  },
  natural: {
    wood: 'forest',
    water: 'water',
    grass: 'grass',
    meadow: 'grass',
    scrub: 'grass',
  },
  leisure: {
    park: 'park',
  },
  boundary: {
    protected_area: 'park',
  },
};

export function classifyLandUse(tags: Record<string, string>): LandUseType {
  for (const [tagKey, valueMap] of Object.entries(LAND_USE_TAG_MAP)) {
    const landUseType = valueMap[tags[tagKey]];

    if (landUseType) {
      return landUseType;
    }
  }

  return 'unknown';
}

export function computeFreeLand(): CandidateSiteFeatureCollection {
  return {
    type: 'FeatureCollection',
    features: [],
  };
}

export function normalizeViewportBounds(bounds: {
  south: number;
  west: number;
  north: number;
  east: number;
}) {
  return {
    ...bounds,
    south: Math.min(bounds.south, bounds.north),
    west: Math.min(bounds.west, bounds.east),
    north: Math.max(bounds.south, bounds.north),
    east: Math.max(bounds.west, bounds.east),
  };
}
