export type MapViewState = {
  center: [number, number];
  zoom: number;
};

const STORAGE_KEY = 'parcel-finder:last-view';

export const DEFAULT_VIEW: MapViewState = {
  center: [52.23, 21.01],
  zoom: 15,
};

const MAX_OSM_ZOOM = 19;

export type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

export function loadLastView(storage: StorageLike = window.localStorage): MapViewState {
  try {
    const raw = storage.getItem(STORAGE_KEY);

    if (!raw) return DEFAULT_VIEW;

    const parsed: unknown = JSON.parse(raw);

    return isMapViewState(parsed) ? parsed : DEFAULT_VIEW;
  } catch {
    return DEFAULT_VIEW;
  }
}

export function saveLastView(view: MapViewState, storage: StorageLike = window.localStorage): void {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(view));
  } catch {
    // Persistence is best-effort; private mode / quota errors are not fatal.
  }
}

function isMapViewState(value: unknown): value is MapViewState {
  if (typeof value !== 'object' || value === null) return false;

  const { center, zoom } = value as Record<string, unknown>;

  if (!Array.isArray(center) || center.length !== 2) return false;

  const [lat, lng] = center;

  return (
    typeof lat === 'number' &&
    Number.isFinite(lat) &&
    lat >= -90 &&
    lat <= 90 &&
    typeof lng === 'number' &&
    Number.isFinite(lng) &&
    lng >= -180 &&
    lng <= 180 &&
    typeof zoom === 'number' &&
    Number.isInteger(zoom) &&
    zoom >= 0 &&
    zoom <= MAX_OSM_ZOOM
  );
}
