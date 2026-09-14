import { QUERY_TAGS } from '@/lib/config';
import type { QueryTag } from '@/lib/config';
import type { RawOsmFeature, RawOsmFeatureCollection, ViewportBounds } from '@/types/geo';
import type { OverpassElement, OverpassGeometryPoint, OverpassResponse } from '@/types/overpass';

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];
const OVERPASS_TIMEOUT_MS = 25_000;
const OVERPASS_RETRY_DELAY_MS = 2_000;
const OVERPASS_RETRYABLE_STATUSES = new Set([429, 502, 503, 504]);

const POLYGON_TAG_KEYS = QUERY_TAGS.map((tag) => tag.key);

function tagClause({ key, values }: QueryTag): string {
  if (!values) {
    return `way["${key}"]`;
  }

  return values.length === 1
    ? `way["${key}"="${values[0]}"]`
    : `way["${key}"~"^(${values.join('|')})$"]`;
}

export function buildOverpassQuery(bounds: ViewportBounds): string {
  const bbox = `${bounds.south},${bounds.west},${bounds.north},${bounds.east}`;
  const clauses = QUERY_TAGS.map((tag) => `${tagClause(tag)}(${bbox})`).join(';\n      ');

  return `
    [out:json][timeout:25];
    (
      ${clauses};
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

function combineSignals(signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController();

  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort(signal.reason);
      break;
    }
    signal.addEventListener('abort', () => controller.abort(signal.reason), { once: true });
  }

  return controller.signal;
}

export async function fetchOverpassData(
  bounds: ViewportBounds,
  signal?: AbortSignal,
): Promise<OverpassResponse> {
  try {
    return await requestOverpass(bounds, 0, signal);
  } catch (error) {
    if (signal?.aborted || !isRetryable(error)) {
      throw error;
    }

    await delay(OVERPASS_RETRY_DELAY_MS, signal);
    return requestOverpass(bounds, 1, signal);
  }
}

async function requestOverpass(
  bounds: ViewportBounds,
  endpointIndex: number,
  signal?: AbortSignal,
): Promise<OverpassResponse> {
  const endpoint = OVERPASS_ENDPOINTS[endpointIndex % OVERPASS_ENDPOINTS.length];
  const query = buildOverpassQuery(bounds);
  const timeoutSignal = AbortSignal.timeout(OVERPASS_TIMEOUT_MS);

  const response = await fetch(`${endpoint}?data=${encodeURIComponent(query)}`, {
    signal: signal ? combineSignals([signal, timeoutSignal]) : timeoutSignal,
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
