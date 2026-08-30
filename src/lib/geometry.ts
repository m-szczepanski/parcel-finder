import type { CandidateSiteFeatureCollection } from '@/types/geo';

export function computeFreeLand(): CandidateSiteFeatureCollection {
  return {
    type: 'FeatureCollection',
    features: [],
  };
}

export function normalizeViewportBounds(bounds: { south: number; west: number; north: number; east: number }) {
  return {
    ...bounds,
    south: Math.min(bounds.south, bounds.north),
    west: Math.min(bounds.west, bounds.east),
    north: Math.max(bounds.south, bounds.north),
    east: Math.max(bounds.west, bounds.east),
  };
}
