import { area as turfArea, booleanIntersects, bbox, centroid } from '@turf/turf';
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

  const { freeLand, takenLanduse } = computeSites(
    { type: 'FeatureCollection', features: landuse },
    { type: 'FeatureCollection', features: buildings },
  );

  return {
    freeLand,
    takenFeatures: [...buildings, ...takenLanduse],
  };
}

type SiteOutcome =
  | { kind: 'empty'; candidate: CandidateSiteFeature }
  | { kind: 'taken'; feature: RawOsmFeature }
  | { kind: 'sliver' };

export function computeSites(
  landuse: RawOsmFeatureCollection,
  buildings: RawOsmFeatureCollection,
): { freeLand: CandidateSiteFeatureCollection; takenLanduse: RawOsmFeature[] } {
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
  const bboxMatched = buildingIndex.filter((building) => boxesIntersect(landuseBox, building.box));

  if (bboxMatched.some((building) => booleanIntersects(feature, building.feature))) {
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

