import { useEffect, useRef, useState } from 'react';
import type { Map as LeafletMap } from 'leaflet';
import { MIN_ZOOM } from '@/lib/config';
import { fetchOverpassData, overpassToGeoJSON } from '@/lib/overpass';
import { getCachedViewportData, setCachedViewportData, snapBounds } from '@/lib/cache';
import type { RawOsmFeatureCollection, ViewportBounds } from '@/types/geo';

const DEBOUNCE_MS = 500;
const REFETCH_MARGIN_RATIO = 0.5;
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

      if (isCoveredByFetch(fetchedBoundsRef.current, bounds)) {
        retireInFlight();
        setLoading(false);
        setError(null);
        return;
      }

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

      if (Date.now() < backoffUntilRef.current) {
        return;
      }

      const requestId = ++requestIdRef.current;
      setLoading(true);
      setError(null);

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
