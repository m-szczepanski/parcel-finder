import { area as turfArea, bbox, centroid } from '@turf/turf';
import type { BBox } from 'geojson';
import { LAND_USE_TAG_MAP, MIN_AREA_M2, TAKEN_LAND_USE_TYPES } from '@/lib/config';
import type {
  CandidateSiteFeature,
  CandidateSiteFeatureCollection,
  LandUseType,
  RawOsmFeature,
  RawOsmFeatureCollection,
} from '@/types/geo';

export function classifyLandUse(tags: Record<string, string>): LandUseType {
  for (const [tagKey, valueMap] of Object.entries(LAND_USE_TAG_MAP)) {
    const landUseType = valueMap[tags[tagKey]];

    if (landUseType) {
      return landUseType;
    }
  }

  return 'unknown';
}

type IndexedBuilding = { feature: RawOsmFeature; box: BBox };

// One derivation pass over the raw viewport data: the building/landuse split
// feeds both the free-land candidates and the taken layer (red rendering + the
// panel), so it happens here once instead of in every consumer.
export function computeViewportSites(data: RawOsmFeatureCollection): {
  freeLand: CandidateSiteFeatureCollection;
  takenFeatures: RawOsmFeature[];
} {
  const buildings: RawOsmFeature[] = [];
  const landuse: RawOsmFeature[] = [];

  for (const feature of data.features) {
    if ('building' in feature.properties.tags) {
      buildings.push(feature);
    } else {
      landuse.push(feature);
    }
  }

  const { freeLand, takenLanduse } = computeFreeLand(
    { type: 'FeatureCollection', features: landuse },
    { type: 'FeatureCollection', features: buildings },
  );

  return {
    freeLand,
    // Taken sites for the red layer and click selection: buildings first, then
    // taken land polygons — the order matters when polygons overlap.
    takenFeatures: [...buildings, ...takenLanduse],
  };
}

// Per-landuse-polygon classification: 'empty' produces a green candidate,
// 'taken' promotes the raw polygon to the taken output, 'sliver' drops it.
type SiteOutcome =
  | { kind: 'empty'; candidate: CandidateSiteFeature }
  | { kind: 'taken'; feature: RawOsmFeature }
  | { kind: 'sliver' };

export function computeFreeLand(
  landuse: RawOsmFeatureCollection,
  buildings: RawOsmFeatureCollection,
): { freeLand: CandidateSiteFeatureCollection; takenLanduse: RawOsmFeature[] } {
  // Pre-computed building bboxes keep the containment checks cheap.
  const buildingIndex: IndexedBuilding[] = buildings.features.map((feature) => ({
    feature,
    box: bbox(feature),
  }));

  const candidates: CandidateSiteFeature[] = [];
  const takenLanduse: RawOsmFeature[] = [];

  for (const feature of landuse.features) {
    try {
      const outcome = classifySite(feature, buildingIndex);

      if (outcome.kind === 'empty') {
        candidates.push(outcome.candidate);
      } else if (outcome.kind === 'taken') {
        takenLanduse.push(outcome.feature);
      }
    } catch (error) {
      // One invalid OSM polygon must not break the batch — log and skip it.
      console.warn(`[geometry] skipping invalid landuse polygon ${feature.properties.id}`, error);
    }
  }

  return {
    freeLand: { type: 'FeatureCollection', features: candidates },
    takenLanduse,
  };
}

function classifySite(feature: RawOsmFeature, buildingIndex: IndexedBuilding[]): SiteOutcome {
  const landuseType = classifyLandUse(feature.properties.tags);

  if (TAKEN_LAND_USE_TYPES.has(landuseType)) {
    return { kind: 'taken', feature };
  }

  const landuseBox = bbox(feature);

  // Step-12 product decision: any building on the polygon takes the whole
  // polygon — a single barn marks the entire field taken (no remainder).
  if (buildingIndex.some((building) => boxesIntersect(landuseBox, building.box))) {
    return { kind: 'taken', feature };
  }

  const area = turfArea(feature);

  if (area < MIN_AREA_M2) {
    return { kind: 'sliver' };
  }

  const [longitude, latitude] = centroid(feature).geometry.coordinates;

  return {
    kind: 'empty',
    candidate: {
      type: 'Feature',
      id: feature.properties.id,
      properties: {
        id: feature.properties.id,
        landuseType,
        area,
        status: 'empty',
        centroid: [longitude, latitude],
      },
      geometry: feature.geometry,
    },
  };
}

function boxesIntersect(a: BBox, b: BBox): boolean {
  return a[0] <= b[2] && b[0] <= a[2] && a[1] <= b[3] && b[1] <= a[3];
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
