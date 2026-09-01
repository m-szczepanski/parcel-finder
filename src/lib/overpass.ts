import type { RawOsmFeature, RawOsmFeatureCollection, ViewportBounds } from '@/types/geo';
import type { OverpassElement, OverpassGeometryPoint, OverpassResponse } from '@/types/overpass';

const OVERPASS_API_URL = 'https://overpass-api.de/api/interpreter';
const OVERPASS_TIMEOUT_MS = 25_000;

const POLYGON_TAG_KEYS = ['building', 'landuse', 'natural', 'leisure'] as const;

export function buildOverpassQuery(bounds: ViewportBounds): string {
  const bbox = `${bounds.south},${bounds.west},${bounds.north},${bounds.east}`;

  return `
    [out:json][timeout:25];
    (
      way["building"](${bbox});
      way["landuse"](${bbox});
      way["natural"](${bbox});
      way["leisure"](${bbox});
    );
    out body geom;
  `.trim();
}

export async function fetchOverpassData(bounds: ViewportBounds): Promise<OverpassResponse> {
  const query = buildOverpassQuery(bounds);

  const response = await fetch(`${OVERPASS_API_URL}?data=${encodeURIComponent(query)}`, {
    signal: AbortSignal.timeout(OVERPASS_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Overpass request failed with status ${response.status}`);
  }

  return (await response.json()) as OverpassResponse;
}

export function overpassToGeoJSON(elements: OverpassElement[]): RawOsmFeatureCollection {
  const features: RawOsmFeature[] = [];

  for (const element of elements) {
    const feature = wayToPolygonFeature(element);

    if (feature) {
      features.push(feature);
    }
  }

  return { type: 'FeatureCollection', features };
}

function wayToPolygonFeature(element: OverpassElement): RawOsmFeature | null {
  // Relations are skipped for v1: multipolygon members are not resolved (documented limitation).
  if (element.type !== 'way' || !element.geometry) {
    return null;
  }

  const { geometry, tags } = element;

  if (!isClosedWay(geometry) || !tags || !POLYGON_TAG_KEYS.some((key) => key in tags)) {
    return null;
  }

  const id = `way/${element.id}`;

  return {
    type: 'Feature',
    id,
    properties: { id, tags },
    geometry: {
      type: 'Polygon',
      coordinates: [geometry.map((point) => [point.lon, point.lat])],
    },
  };
}

function isClosedWay(geometry: OverpassGeometryPoint[]): boolean {
  if (geometry.length < 4) {
    return false;
  }

  const first = geometry[0];
  const last = geometry[geometry.length - 1];

  return first.lat === last.lat && first.lon === last.lon;
}
