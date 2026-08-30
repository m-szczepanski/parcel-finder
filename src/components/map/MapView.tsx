import { useEffect, useState, type Ref } from 'react';
import { MapContainer, TileLayer, useMapEvents } from 'react-leaflet';
import type { Map as LeafletMap } from 'leaflet';
import { loadLastView, saveLastView } from '@/lib/mapState';

const OSM_TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

const GEOLOCATION_TIMEOUT_MS = 5000;
const GEOLOCATION_MAX_AGE_MS = 60_000;

type MapViewProps = {
  ref?: Ref<LeafletMap>;
};

export function MapView({ ref }: MapViewProps) {
  const [initialView] = useState(loadLastView);

  return (
    <MapContainer ref={ref} center={initialView.center} zoom={initialView.zoom} maxZoom={19}>
      <TileLayer attribution={OSM_ATTRIBUTION} url={OSM_TILE_URL} />
      <ViewportController />
    </MapContainer>
  );
}

function ViewportController() {
  const map = useMapEvents({
    moveend: () => {
      const center = map.getCenter();
      saveLastView({ center: [center.lat, center.lng], zoom: map.getZoom() });
    },
  });

  useEffect(() => {
    let cancelled = false;
    const cancel = () => {
      cancelled = true;
    };

    if (navigator.geolocation) {
      map.on('dragstart', cancel);
      map.on('zoomstart', cancel);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (!cancelled) {
            map.setView([position.coords.latitude, position.coords.longitude], map.getZoom());
          }
        },
        () => undefined,
        {
          timeout: GEOLOCATION_TIMEOUT_MS,
          maximumAge: GEOLOCATION_MAX_AGE_MS,
        },
      );
    }

    return () => {
      cancelled = true;
      map.off('dragstart', cancel);
      map.off('zoomstart', cancel);
    };
  }, [map]);

  return null;
}
