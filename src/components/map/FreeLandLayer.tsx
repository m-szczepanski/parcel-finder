import { DomEvent, type Path, type PathOptions } from 'leaflet';
import { GeoJSON } from 'react-leaflet';
import { useSelectedSiteStyle } from '@/hooks/useSelectedSiteStyle';
import type { CandidateSiteFeature, CandidateSiteFeatureCollection } from '@/types/geo';

const DEFAULT_STYLE: PathOptions = {
  color: '#059669',
  fillColor: '#10b981',
  fillOpacity: 0.15,
  weight: 1,
};

const HOVER_STYLE: PathOptions = {
  color: '#9ca3af',
  fillColor: '#9ca3af',
  fillOpacity: 0.3,
  weight: 1,
};

const SELECTED_STYLE: PathOptions = {
  color: '#047857',
  fillColor: '#34d399',
  fillOpacity: 0.4,
  weight: 2,
};

export function FreeLandLayer({ data }: { data: CandidateSiteFeatureCollection }) {
  const { selectedFeature, selectFeature, isStyledSelection, styleSelection } =
    useSelectedSiteStyle(DEFAULT_STYLE, SELECTED_STYLE);

  return (
    <GeoJSON
      data={data}
      style={DEFAULT_STYLE}
      onEachFeature={(rawFeature, layer) => {
        const feature = rawFeature as CandidateSiteFeature;
        const path = layer as Path;
        const { id } = feature.properties;

        if (selectedFeature?.properties.id === id) {
          styleSelection(path, id);
        }

        path.on({
          mouseover: () => {
            if (!isStyledSelection(path)) {
              path.setStyle(HOVER_STYLE);
            }
          },
          mouseout: () => {
            if (!isStyledSelection(path)) {
              path.setStyle(DEFAULT_STYLE);
            }
          },
          click: (event) => {
            DomEvent.stopPropagation(event);

            styleSelection(path, id);
            selectFeature(feature);
          },
        });
      }}
    />
  );
}
