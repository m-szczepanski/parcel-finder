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
  version: number;
};

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
  // Bumped on every data change — react-leaflet's GeoJSON ignores data prop
  // updates after creation, so consumers key the layer on this counter.
  const [version, setVersion] = useState(0);
  const requestIdRef = useRef(0);
  const fetchedBoundsRef = useRef<ViewportBounds | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!map) {
      return;
    }

    let timer: ReturnType<typeof setTimeout> | undefined;

    const applyData = (collection: RawOsmFeatureCollection) => {
      setData(collection);
      setVersion((current) => current + 1);
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
        // Retire any superseded in-flight request so it can neither overwrite the
        // already-valid data nor surface its abort as an error.
        abortRef.current?.abort();
        requestIdRef.current += 1;
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
        // Retire any superseded in-flight request, same as the covered path above.
        abortRef.current?.abort();
        requestIdRef.current += 1;
        fetchedBoundsRef.current = snapped;
        applyData(cached);
        setLoading(false);
        setError(null);
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
          logFetchedCounts(snapped, response.elements.length, collection.features.length);
        })
        .catch((cause: unknown) => {
          if (requestIdRef.current !== requestId) return;
          setError(cause instanceof Error ? cause : new Error(String(cause)));
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
      abortRef.current?.abort();
      requestIdRef.current += 1;
    };
  }, [map]);

  return { data, loading, error, belowMinZoom, version };
}
