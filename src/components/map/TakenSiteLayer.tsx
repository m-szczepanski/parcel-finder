import { DomEvent, type PathOptions } from 'leaflet';
import type { FeatureCollection } from 'geojson';
import { GeoJSON } from 'react-leaflet';
import { useSelectedFeature } from '@/hooks/useSelectedFeature';
import type { RawOsmFeature } from '@/types/geo';

// Step-12 spec: same opacities as the free-land layer's green values, in red
// (Tailwind red-600 stroke / red-500 fill).
const DEFAULT_STYLE: PathOptions = {
  color: '#dc2626',
  fillColor: '#ef4444',
  fillOpacity: 0.15,
  weight: 1,
};

type TakenSiteLayerProps = {
  features: RawOsmFeature[];
};

export function TakenSiteLayer({ features }: TakenSiteLayerProps) {
  const { selectFeature } = useSelectedFeature();
  const collection: FeatureCollection = { type: 'FeatureCollection', features };

  return (
    <GeoJSON
      data={collection}
      style={DEFAULT_STYLE}
      onEachFeature={(rawFeature, layer) => {
        const feature = rawFeature as RawOsmFeature;

        // Product decision: taken sites get no hover effect — the red fill is
        // the cue, and clicking opens the panel with the taken notice.
        layer.on({
          click: (event) => {
            // Keep the click from reaching the map-level deselect handler.
            DomEvent.stopPropagation(event);

            selectFeature({ ...feature, properties: { ...feature.properties, status: 'taken' } });
          },
        });
      }}
    />
  );
}
