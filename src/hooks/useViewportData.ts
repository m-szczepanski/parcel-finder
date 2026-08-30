import { useMemo, useState } from 'react';
import type { CandidateSiteFeatureCollection, ViewportBounds } from '@/types/geo';

const MIN_ZOOM = 15;

export function useViewportData(map: { getBounds: () => any; getZoom: () => number } | null) {
  const [data] = useState<CandidateSiteFeatureCollection>({ type: 'FeatureCollection', features: [] });

  const bounds = useMemo<ViewportBounds | null>(() => {
    if (!map) return null;
    const box = map.getBounds();
    return {
      south: box.getSouth(),
      west: box.getWest(),
      north: box.getNorth(),
      east: box.getEast(),
    };
  }, [map]);

  if (!map || !bounds || map.getZoom() < MIN_ZOOM) {
    return { data: { type: 'FeatureCollection', features: [] }, loading: false, error: null };
  }

  return { data, loading: false, error: null };
}
