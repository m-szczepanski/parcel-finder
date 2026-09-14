import { render, type RenderResult } from '@testing-library/react';
import { GeoJSON as LeafletGeoJSON } from 'leaflet';
import type { Layer, Map as LeafletMap, Path } from 'leaflet';
import type { ReactNode } from 'react';
import { MapContainer } from 'react-leaflet';
import { SelectedFeatureProvider } from '@/hooks/useSelectedFeature';
import { SelectionProbe } from '@/test/selectionProbe';

export function geoJsonPaths(map: LeafletMap): Path[] {
  const layers: Layer[] = [];
  map.eachLayer((layer) => {
    if (layer instanceof LeafletGeoJSON) {
      layers.push(...layer.getLayers());
    }
  });

  return layers as Path[];
}

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
