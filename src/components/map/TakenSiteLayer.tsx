import { DomEvent, type Path, type PathOptions } from 'leaflet';
import type { FeatureCollection } from 'geojson';
import { GeoJSON } from 'react-leaflet';
import { useSelectedSiteStyle } from '@/hooks/useSelectedSiteStyle';
import type { RawOsmFeature } from '@/types/geo';

// Step-12 spec: same opacities as the free-land layer's green values, in red
// (Tailwind red-600 stroke / red-500 fill).
const DEFAULT_STYLE: PathOptions = {
  color: '#dc2626',
  fillColor: '#ef4444',
  fillOpacity: 0.15,
  weight: 1,
};

// Mirrors the green layer's selected values (weight 2, brighter red fill),
// so a taken site reads at a glance too (Tailwind red-800/400).
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

        // Remounts (new data key) must restore the selected style on the
        // polygon that is still selected in the context.
        if (selectedFeature?.properties.id === id) {
          styleSelection(path, id);
        }

        // Product decision: taken sites get no hover effect — the red fill is
        // the cue, and clicking opens the panel with the taken notice.
        path.on({
          click: (event) => {
            // Keep the click from reaching the map-level deselect handler.
            DomEvent.stopPropagation(event);

            styleSelection(path, id);
            selectFeature({ ...feature, properties: { ...feature.properties, status: 'taken' } });
          },
        });
      }}
    />
  );
}
