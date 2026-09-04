import { useEffect, useRef } from 'react';
import { DomEvent, type Path, type PathOptions } from 'leaflet';
import { GeoJSON } from 'react-leaflet';
import { useSelectedFeature } from '@/hooks/useSelectedFeature';
import type { CandidateSiteFeature, CandidateSiteFeatureCollection } from '@/types/geo';

// Step-04 spec: subtle green fill at 0.15 opacity with a visible border.
const DEFAULT_STYLE: PathOptions = {
  color: '#059669',
  fillColor: '#10b981',
  fillOpacity: 0.15,
  weight: 1,
};

// Product spec: hovering an empty site shows a transparent gray fill with gray
// borders (Tailwind gray-400). Hover is style-only — no shared state changes;
// the panel opens on click instead. A selected polygon keeps this style until
// it is deselected.
const HOVER_STYLE: PathOptions = {
  color: '#9ca3af',
  fillColor: '#9ca3af',
  fillOpacity: 0.3,
  weight: 1,
};

// The layer currently carrying the selection style, tracked by feature id so
// a stale layer (e.g. after a remount on new data) can never be mistyped.
type SelectedLayer = { id: string; layer: Path };

type FreeLandLayerProps = {
  data: CandidateSiteFeatureCollection;
};

export function FreeLandLayer({ data }: FreeLandLayerProps) {
  const { selectedFeature, selectFeature } = useSelectedFeature();
  const selectedLayerRef = useRef<SelectedLayer | null>(null);

  // Deselection happens outside this component (bare-map click, taken-site
  // click) — revert the gray style once the selection no longer matches.
  useEffect(() => {
    const selection = selectedLayerRef.current;

    if (selection && selection.id !== selectedFeature?.properties.id) {
      selection.layer.setStyle(DEFAULT_STYLE);
      selectedLayerRef.current = null;
    }
  }, [selectedFeature]);

  return (
    <GeoJSON
      data={data}
      style={DEFAULT_STYLE}
      onEachFeature={(rawFeature, layer) => {
        const feature = rawFeature as CandidateSiteFeature;
        const path = layer as Path;

        // Remounts (new data key) must restore the gray style on the polygon
        // that is still selected in the context.
        if (selectedFeature?.properties.id === feature.properties.id) {
          selectedLayerRef.current = { id: feature.properties.id, layer: path };
          path.setStyle(HOVER_STYLE);
        }

        path.on({
          mouseover: () => {
            if (path !== selectedLayerRef.current?.layer) {
              path.setStyle(HOVER_STYLE);
            }
          },
          mouseout: () => {
            if (path !== selectedLayerRef.current?.layer) {
              path.setStyle(DEFAULT_STYLE);
            }
          },
          click: (event) => {
            // Keep the click from reaching the map-level taken-site check.
            DomEvent.stopPropagation(event);

            if (path !== selectedLayerRef.current?.layer) {
              selectedLayerRef.current?.layer.setStyle(DEFAULT_STYLE);
              selectedLayerRef.current = { id: feature.properties.id, layer: path };
              path.setStyle(HOVER_STYLE);
            }

            selectFeature(feature);
          },
        });
      }}
    />
  );
}
