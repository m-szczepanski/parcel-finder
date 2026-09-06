import { useEffect, useRef, useState } from 'react';
import type { Map as LeafletMap } from 'leaflet';
import { fetchOverpassData, overpassToGeoJSON } from '@/lib/overpass';
import { getCachedViewportData, setCachedViewportData, snapBounds } from '@/lib/cache';
import type { RawOsmFeatureCollection, ViewportBounds } from '@/types/geo';

// Widened from the originally documented 15 so candidates show across a wider zoom
// range; below 13 city-wide bboxes get too heavy for Overpass. Tuned in step 10.
const MIN_ZOOM = 13;
const DEBOUNCE_MS = 500;
// Once an area is fetched, it keeps serving while the viewport stays within half a
// viewport of the fetched bounds — panning around locally must feel instant.
const REFETCH_MARGIN_RATIO = 0.5;
// Rate-limit backoff (tech doc section 5): after a failure, automatic refetches are
// skipped for an exponentially growing window so we stop hammering a busy Overpass.
const BASE_BACKOFF_MS = 2000;
const MAX_BACKOFF_MS = 30_000;

function isCoveredByFetch(fetched: ViewportBounds | null, bounds: ViewportBounds): boolean {
  if (!fetched) {
    return false;
  }

  const latMargin = (fetched.north - fetched.south) * REFETCH_MARGIN_RATIO;
  const lonMargin = (fetched.east - fetched.west) * REFETCH_MARGIN_RATIO;

  return (
    bounds.south >= fetched.south - latMargin &&
    bounds.west >= fetched.west - lonMargin &&
    bounds.north <= fetched.north + latMargin &&
    bounds.east <= fetched.east + lonMargin
  );
}

const EMPTY_COLLECTION: RawOsmFeatureCollection = {
  type: 'FeatureCollection',
  features: [],
};

type ViewportDataResult = {
  data: RawOsmFeatureCollection;
  loading: boolean;
  error: Error | null;
  belowMinZoom: boolean;
  // Consecutive failed fetches, reset on the first success — the App uses it to
  // switch the toast to a calmer "waiting" message once Overpass looks rate-limited.
  failures: number;
  version: number;
};

function backoffFor(consecutiveFailures: number): number {
  return Math.min(BASE_BACKOFF_MS * 2 ** (consecutiveFailures - 1), MAX_BACKOFF_MS);
}

function readBounds(map: LeafletMap): ViewportBounds {
  const bounds = map.getBounds();

  return {
    south: bounds.getSouth(),
    west: bounds.getWest(),
    north: bounds.getNorth(),
    east: bounds.getEast(),
  };
}

function logFetchedCounts(bounds: ViewportBounds, elements: number, polygons: number): void {
  if (import.meta.env.DEV) {
    const bbox = [bounds.south, bounds.west, bounds.north, bounds.east].join(',');
    console.debug(`[overpass] bbox=${bbox} elements=${elements} polygons=${polygons}`);
  }
}

export function useViewportData(map: LeafletMap | null): ViewportDataResult {
  const [data, setData] = useState<RawOsmFeatureCollection>(EMPTY_COLLECTION);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [belowMinZoom, setBelowMinZoom] = useState(true);
  const [failures, setFailures] = useState(0);
  // Bumped on every data change — react-leaflet's GeoJSON ignores data prop
  // updates after creation, so consumers key the layer on this counter.
  const [version, setVersion] = useState(0);
  const requestIdRef = useRef(0);
  const fetchedBoundsRef = useRef<ViewportBounds | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const failureCountRef = useRef(0);
  const backoffUntilRef = useRef(0);

  useEffect(() => {
    if (!map) {
      return;
    }

    let timer: ReturnType<typeof setTimeout> | undefined;

    // Retire any superseded in-flight request: it can neither overwrite valid
    // data nor surface its abort as an error, and Overpass allows only a couple
    // of concurrent requests per client.
    const retireInFlight = () => {
      abortRef.current?.abort();
      requestIdRef.current += 1;
    };

    const applyData = (collection: RawOsmFeatureCollection) => {
      setData(collection);
      setVersion((current) => current + 1);
    };

    const recordSuccess = () => {
      failureCountRef.current = 0;
      backoffUntilRef.current = 0;
      setFailures(0);
    };

    const recordFailure = () => {
      const nextFailures = failureCountRef.current + 1;
      failureCountRef.current = nextFailures;
      backoffUntilRef.current = Date.now() + backoffFor(nextFailures);
      setFailures(nextFailures);
    };

    const fetchViewport = () => {
      if (map.getZoom() < MIN_ZOOM) {
        fetchedBoundsRef.current = null;
        applyData(EMPTY_COLLECTION);
        setLoading(false);
        setError(null);
        setBelowMinZoom(true);
        return;
      }

      const bounds = readBounds(map);
      setBelowMinZoom(false);

      // The viewport is still covered by the last successful fetch — keep the current
      // polygons on screen instead of waiting on another Overpass round-trip.
      if (isCoveredByFetch(fetchedBoundsRef.current, bounds)) {
        retireInFlight();
        setLoading(false);
        setError(null);
        return;
      }

      // Fetch the grid-snapped bbox instead of the raw viewport: equal snapped
      // bboxes share one cache entry, so returning to an area costs no network
      // round-trip (docs section 3.4).
      const snapped = snapBounds(bounds);

      const cached = getCachedViewportData(snapped);
      if (cached) {
        retireInFlight();
        fetchedBoundsRef.current = snapped;
        applyData(cached);
        recordSuccess();
        setLoading(false);
        setError(null);
        return;
      }

      // Rate-limit backoff: skip the automatic refetch while the window is active so
      // a busy Overpass isn't pounded; the next user pan after it lapses retries
      // naturally. The last successful layer stays visible meanwhile.
      if (Date.now() < backoffUntilRef.current) {
        return;
      }

      const requestId = ++requestIdRef.current;
      setLoading(true);
      setError(null);

      // Overpass allows only a couple of concurrent requests per client — abort the
      // superseded in-flight one instead of leaving it queueing.
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      fetchOverpassData(snapped, controller.signal)
        .then((response) => {
          if (requestIdRef.current !== requestId) return;
          const collection = overpassToGeoJSON(response.elements);
          setCachedViewportData(snapped, collection);
          fetchedBoundsRef.current = snapped;
          applyData(collection);
          recordSuccess();
          logFetchedCounts(snapped, response.elements.length, collection.features.length);
        })
        .catch((cause: unknown) => {
          if (requestIdRef.current !== requestId) return;
          setError(cause instanceof Error ? cause : new Error(String(cause)));
          recordFailure();
        })
        .finally(() => {
          if (requestIdRef.current !== requestId) return;
          setLoading(false);
        });
    };

    const scheduleFetch = () => {
      clearTimeout(timer);
      timer = setTimeout(fetchViewport, DEBOUNCE_MS);
    };

    scheduleFetch();
    map.on('moveend', scheduleFetch);
    map.on('zoomend', scheduleFetch);

    return () => {
      map.off('moveend', scheduleFetch);
      map.off('zoomend', scheduleFetch);
      clearTimeout(timer);
      retireInFlight();
    };
  }, [map]);

  return { data, loading, error, belowMinZoom, failures, version };
}
