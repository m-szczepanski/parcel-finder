import type { Path, PathOptions } from 'leaflet';
import { GeoJSON } from 'react-leaflet';
import type { CandidateSiteFeatureCollection } from '@/types/geo';

// Step-04 spec: subtle green fill at 0.15 opacity with a visible border.
const DEFAULT_STYLE: PathOptions = {
  color: '#059669',
  fillColor: '#10b981',
  fillOpacity: 0.15,
  weight: 1,
};

// Product spec: hovering an empty site shows a transparent gray fill with gray
// borders (Tailwind gray-400). Hover is style-only — no shared state changes;
// the panel opens on click instead.
const HOVER_STYLE: PathOptions = {
  color: '#9ca3af',
  fillColor: '#9ca3af',
  fillOpacity: 0.3,
  weight: 1,
};

type FreeLandLayerProps = {
  data: CandidateSiteFeatureCollection;
};

export function FreeLandLayer({ data }: FreeLandLayerProps) {
  return (
    <GeoJSON
      data={data}
      style={DEFAULT_STYLE}
      onEachFeature={(_, layer) => {
        const path = layer as Path;

        path.on({
          mouseover: () => path.setStyle(HOVER_STYLE),
          mouseout: () => path.setStyle(DEFAULT_STYLE),
        });
      }}
    />
  );
}
