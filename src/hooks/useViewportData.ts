import { useEffect, useRef, useState } from 'react';
import type { Map as LeafletMap } from 'leaflet';
import { fetchOverpassData, overpassToGeoJSON } from '@/lib/overpass';
import type { RawOsmFeatureCollection, ViewportBounds } from '@/types/geo';

const MIN_ZOOM = 15;
const DEBOUNCE_MS = 500;

const EMPTY_COLLECTION: RawOsmFeatureCollection = {
  type: 'FeatureCollection',
  features: [],
};

type ViewportDataResult = {
  data: RawOsmFeatureCollection;
  loading: boolean;
  error: Error | null;
  belowMinZoom: boolean;
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
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!map) {
      return;
    }

    let timer: ReturnType<typeof setTimeout> | undefined;

    const fetchViewport = () => {
      const requestId = ++requestIdRef.current;

      if (map.getZoom() < MIN_ZOOM) {
        setData(EMPTY_COLLECTION);
        setLoading(false);
        setError(null);
        setBelowMinZoom(true);
        return;
      }

      const bounds = readBounds(map);
      setLoading(true);
      setError(null);
      setBelowMinZoom(false);

      fetchOverpassData(bounds)
        .then((response) => {
          if (requestIdRef.current !== requestId) return;
          const collection = overpassToGeoJSON(response.elements);
          setData(collection);
          logFetchedCounts(bounds, response.elements.length, collection.features.length);
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
      requestIdRef.current += 1;
    };
  }, [map]);

  return { data, loading, error, belowMinZoom };
}
