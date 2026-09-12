import { render, type RenderResult } from '@testing-library/react';
import { GeoJSON as LeafletGeoJSON } from 'leaflet';
import type { Layer, Map as LeafletMap, Path } from 'leaflet';
import type { ReactNode } from 'react';
import { MapContainer } from 'react-leaflet';
import { SelectedFeatureProvider } from '@/hooks/useSelectedFeature';
import { SelectionProbe } from '@/test/selectionProbe';

// Every sub-layer of every GeoJSON layer on the map, as clickable Path objects.
export function geoJsonPaths(map: LeafletMap): Path[] {
  const layers: Layer[] = [];
  map.eachLayer((layer) => {
    if (layer instanceof LeafletGeoJSON) {
      layers.push(...layer.getLayers());
    }
  });

  return layers as Path[];
}

// Renders a polygon layer on a real map (center matches the fixtures used in
// the map tests) together with the selection probe the tests assert against.
export function renderOnMap(children: ReactNode): {
  mapRef: { current: LeafletMap | null };
  view: RenderResult;
} {
  const mapRef: { current: LeafletMap | null } = { current: null };

  const view = render(
    <SelectedFeatureProvider>
      <MapContainer
        ref={(map) => {
          mapRef.current = map ?? null;
        }}
        center={[52.15, 21.05]}
        zoom={15}
      >
        {children}
      </MapContainer>
      <SelectionProbe />
    </SelectedFeatureProvider>,
  );

  return { mapRef, view };
}
