import type { RawOsmFeature, RawOsmFeatureCollection, ViewportBounds } from '@/types/geo';
import type { OverpassElement, OverpassGeometryPoint, OverpassResponse } from '@/types/overpass';

const OVERPASS_API_URL = 'https://overpass-api.de/api/interpreter';
const OVERPASS_TIMEOUT_MS = 25_000;
const OVERPASS_RETRY_DELAY_MS = 2_000;
const OVERPASS_RETRYABLE_STATUSES = new Set([429, 502, 503, 504]);

const POLYGON_TAG_KEYS = ['building', 'landuse', 'natural', 'leisure'] as const;

export function buildOverpassQuery(bounds: ViewportBounds): string {
  const bbox = `${bounds.south},${bounds.west},${bounds.north},${bounds.east}`;

  // Only policy-relevant natural/leisure values are fetched: the unfiltered
  // way["natural"]/way["leisure"] queries ballooned the response and tripped
  // Overpass rate limits. Tuned in step 10.
  return `
    [out:json][timeout:25];
    (
      way["building"](${bbox});
      way["landuse"](${bbox});
      way["natural"~"^(wood|water|scrub|grass|meadow|heath)$"](${bbox});
      way["leisure"="park"](${bbox});
    );
    out body geom;
  `.trim();
}

type OverpassFailure = Error & { status?: number };

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(new DOMException('aborted', 'AbortError'));
      },
      { once: true },
    );
  });
}

function isRetryable(error: unknown): boolean {
  if (error instanceof DOMException && error.name === 'TimeoutError') {
    return true;
  }

  const status = (error as OverpassFailure | null)?.status;

  return status !== undefined && OVERPASS_RETRYABLE_STATUSES.has(status);
}

export async function fetchOverpassData(
  bounds: ViewportBounds,
  signal?: AbortSignal,
): Promise<OverpassResponse> {
  try {
    return await requestOverpass(bounds, signal);
  } catch (error) {
    // The public instance throttles heavy clients — one backed-off retry recovers
    // transient 429/5xx slots instead of failing the viewport outright.
    if (signal?.aborted || !isRetryable(error)) {
      throw error;
    }

    await delay(OVERPASS_RETRY_DELAY_MS, signal);
    return requestOverpass(bounds, signal);
  }
}

async function requestOverpass(
  bounds: ViewportBounds,
  signal?: AbortSignal,
): Promise<OverpassResponse> {
  const query = buildOverpassQuery(bounds);
  const timeoutSignal = AbortSignal.timeout(OVERPASS_TIMEOUT_MS);

  const response = await fetch(`${OVERPASS_API_URL}?data=${encodeURIComponent(query)}`, {
    signal: signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal,
  });

  if (!response.ok) {
    const failure: OverpassFailure = new Error(
      `Overpass request failed with status ${response.status}`,
    );
    failure.status = response.status;
    throw failure;
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
