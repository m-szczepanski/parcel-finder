import type { PathOptions } from 'leaflet';
import { GeoJSON } from 'react-leaflet';
import type { CandidateSiteFeatureCollection } from '@/types/geo';

// Step-04 spec: subtle green fill at 0.15 opacity with a visible border.
const DEFAULT_STYLE: PathOptions = {
  color: '#059669',
  fillColor: '#10b981',
  fillOpacity: 0.15,
  weight: 1,
};

type FreeLandLayerProps = {
  data: CandidateSiteFeatureCollection;
};

export function FreeLandLayer({ data }: FreeLandLayerProps) {
  return <GeoJSON data={data} style={DEFAULT_STYLE} />;
}
