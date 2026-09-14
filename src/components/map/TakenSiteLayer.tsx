import { DomEvent, type Path, type PathOptions } from 'leaflet';
import type { FeatureCollection } from 'geojson';
import { GeoJSON } from 'react-leaflet';
import { useSelectedSiteStyle } from '@/hooks/useSelectedSiteStyle';
import type { RawOsmFeature } from '@/types/geo';

const DEFAULT_STYLE: PathOptions = {
  color: '#dc2626',
  fillColor: '#ef4444',
  fillOpacity: 0.15,
  weight: 1,
};

const SELECTED_STYLE: PathOptions = {
  color: '#991b1b',
  fillColor: '#f87171',
  fillOpacity: 0.4,
  weight: 2,
};

export function TakenSiteLayer({ features }: { features: RawOsmFeature[] }) {
  const { selectedFeature, selectFeature, styleSelection } = useSelectedSiteStyle(
    DEFAULT_STYLE,
    SELECTED_STYLE,
  );
  const collection: FeatureCollection = { type: 'FeatureCollection', features };

  return (
    <GeoJSON
      data={collection}
      style={DEFAULT_STYLE}
      onEachFeature={(rawFeature, layer) => {
        const feature = rawFeature as RawOsmFeature;
        const path = layer as Path;
        const { id } = feature.properties;

        if (selectedFeature?.properties.id === id) {
          styleSelection(path, id);
        }

        path.on({
          click: (event) => {
            DomEvent.stopPropagation(event);

            styleSelection(path, id);
            selectFeature({ ...feature, properties: { ...feature.properties, status: 'taken' } });
          },
        });
      }}
    />
  );
}
