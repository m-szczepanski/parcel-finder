import { DomEvent, type Path, type PathOptions } from 'leaflet';
import { GeoJSON } from 'react-leaflet';
import { useSelectedSiteStyle } from '@/hooks/useSelectedSiteStyle';
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
// the panel opens on click instead.
const HOVER_STYLE: PathOptions = {
  color: '#9ca3af',
  fillColor: '#9ca3af',
  fillOpacity: 0.3,
  weight: 1,
};

// The selected site reads at a glance even next to hovered ones: darker
// emerald border, brighter fill (Tailwind emerald-700/400).
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

        // Remounts (new data key) must restore the selected style on the
        // polygon that is still selected in the context.
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
            // Keep the click from reaching the map-level deselect handler.
            DomEvent.stopPropagation(event);

            styleSelection(path, id);
            selectFeature(feature);
          },
        });
      }}
    />
  );
}
