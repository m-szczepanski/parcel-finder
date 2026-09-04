import { area as turfArea, bbox, centroid, difference, union } from '@turf/turf';
import type { BBox, Feature, FeatureCollection, MultiPolygon, Polygon } from 'geojson';
import type {
  CandidateSiteFeature,
  CandidateSiteFeatureCollection,
  LandUseType,
  RawOsmFeature,
  RawOsmFeatureCollection,
} from '@/types/geo';

// Slivers below this area (m²) are discarded; tuned in step 10.
export const MIN_AREA_M2 = 50;

// Maps OSM tags to LandUseType. First matching tag key wins (landuse, then natural,
// leisure, boundary). Anything unmapped falls back to 'unknown'. The exclude/include
// policy is tuned in step 10 — keep this table small.
const LAND_USE_TAG_MAP: Record<string, Record<string, LandUseType>> = {
  landuse: {
    residential: 'residential',
    commercial: 'commercial',
    industrial: 'industrial',
    farmland: 'farmland',
    allotments: 'farmland',
    grass: 'grass',
    meadow: 'grass',
    village_green: 'grass',
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

export function classifyLandUse(tags: Record<string, string>): LandUseType {
  for (const [tagKey, valueMap] of Object.entries(LAND_USE_TAG_MAP)) {
    const landUseType = valueMap[tags[tagKey]];

    if (landUseType) {
      return landUseType;
    }
  }

  return 'unknown';
}

// Product decision (app doc section 8): forests, water and parks/protected areas are
// taken and never become free-land candidates. Buildings are subtracted instead.
const TAKEN_LAND_USE_TYPES: ReadonlySet<LandUseType> = new Set(['forest', 'water', 'park']);

type PolygonFeature = Feature<Polygon | MultiPolygon>;
type IndexedBuilding = { feature: RawOsmFeature; box: BBox };

// Raw viewport features that count as "taken" for the click-time taken-site
// check (tech doc 3.7): building polygons first, then taken landuse/natural
// polygons — the order matters when polygons overlap.
export function selectTakenFeatures(data: RawOsmFeatureCollection): RawOsmFeature[] {
  const buildings: RawOsmFeature[] = [];
  const takenLand: RawOsmFeature[] = [];

  for (const feature of data.features) {
    if ('building' in feature.properties.tags) {
      buildings.push(feature);
    } else if (TAKEN_LAND_USE_TYPES.has(classifyLandUse(feature.properties.tags))) {
      takenLand.push(feature);
    }
  }

  return [...buildings, ...takenLand];
}

export function computeFreeLand(
  landuse: RawOsmFeatureCollection,
  buildings: RawOsmFeatureCollection,
): CandidateSiteFeatureCollection {
  // Pre-computed building bboxes keep the expensive union/difference calls rare.
  const buildingIndex: IndexedBuilding[] = buildings.features.map((feature) => ({
    feature,
    box: bbox(feature),
  }));

  const candidates: CandidateSiteFeature[] = [];

  for (const feature of landuse.features) {
    try {
      const candidate = toCandidateSite(feature, buildingIndex);

      if (candidate) {
        candidates.push(candidate);
      }
    } catch (error) {
      // One invalid OSM polygon must not break the batch — log and skip it.
      console.warn(`[geometry] skipping invalid landuse polygon ${feature.properties.id}`, error);
    }
  }

  return { type: 'FeatureCollection', features: candidates };
}

function toCandidateSite(
  feature: RawOsmFeature,
  buildingIndex: IndexedBuilding[],
): CandidateSiteFeature | null {
  const landuseType = classifyLandUse(feature.properties.tags);

  if (TAKEN_LAND_USE_TYPES.has(landuseType)) {
    return null;
  }

  const landuseBox = bbox(feature);
  const overlapping = buildingIndex
    .filter((building) => boxesIntersect(landuseBox, building.box))
    .map((building) => building.feature);

  const remainder = subtractBuildings(feature, overlapping);

  if (!remainder) {
    return null; // fully covered by buildings
  }

  const area = turfArea(remainder);

  if (area < MIN_AREA_M2) {
    return null; // sliver
  }

  const [longitude, latitude] = centroid(remainder).geometry.coordinates;

  return {
    type: 'Feature',
    id: feature.properties.id,
    properties: {
      id: feature.properties.id,
      landuseType,
      area,
      status: 'empty',
      centroid: [longitude, latitude],
    },
    geometry: remainder.geometry,
  };
}

function subtractBuildings(landuse: RawOsmFeature, overlapping: RawOsmFeature[]): PolygonFeature | null {
  if (overlapping.length === 0) {
    return landuse;
  }

  // Turf 7: union() takes a FeatureCollection and requires at least two geometries.
  const buildingUnion =
    overlapping.length === 1 ? overlapping[0] : union(toFeatureCollection(overlapping));

  if (!buildingUnion) {
    return landuse;
  }

  // Turf 7: difference() takes a FeatureCollection (base polygon first); it returns
  // null when the building union fully covers the landuse polygon.
  return difference(toFeatureCollection([landuse, buildingUnion]));
}

function toFeatureCollection(features: readonly PolygonFeature[]): FeatureCollection<Polygon | MultiPolygon> {
  return { type: 'FeatureCollection', features: [...features] };
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
