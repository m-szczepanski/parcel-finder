import { GeoJSON as LeafletGeoJSON } from 'leaflet';
import type { Layer, Map as LeafletMap, Path } from 'leaflet';

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
