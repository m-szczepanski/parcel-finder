import { useEffect, useState, type Ref } from 'react';
import { MapContainer, TileLayer, useMapEvents } from 'react-leaflet';
import { booleanPointInPolygon, point } from '@turf/turf';
import type { Map as LeafletMap } from 'leaflet';
import { FreeLandLayer } from '@/components/map/FreeLandLayer';
import { loadLastView, saveLastView } from '@/lib/mapState';
import { useSelectedFeature } from '@/hooks/useSelectedFeature';
import type { CandidateSiteFeatureCollection, RawOsmFeature } from '@/types/geo';

const OSM_TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

const GEOLOCATION_TIMEOUT_MS = 5000;
const GEOLOCATION_MAX_AGE_MS = 60_000;

type MapViewProps = {
  ref?: Ref<LeafletMap>;
  freeLand?: { key: number; data: CandidateSiteFeatureCollection };
  belowMinZoom?: boolean;
  takenFeatures?: RawOsmFeature[];
};

export function MapView({
  ref,
  freeLand,
  belowMinZoom = false,
  takenFeatures = [],
}: MapViewProps) {
  const [initialView] = useState(loadLastView);

  return (
    <MapContainer ref={ref} center={initialView.center} zoom={initialView.zoom} maxZoom={19}>
      <TileLayer attribution={OSM_ATTRIBUTION} url={OSM_TILE_URL} />
      {!belowMinZoom && freeLand && freeLand.data.features.length > 0 && (
        // react-leaflet's GeoJSON ignores data updates after creation, so the key
        // must change per fetch to force a fresh layer.
        <FreeLandLayer key={freeLand.key} data={freeLand.data} />
      )}
      <TakenSiteCheck features={takenFeatures} />
      <ViewportController />
    </MapContainer>
  );
}

// A click no polygon layer consumed lands here (tech doc 3.7): the point is
// checked against the raw taken features (buildings first, then taken land) —
// a hit selects the site as taken for the panel, a miss closes it.
function TakenSiteCheck({ features }: { features: RawOsmFeature[] }) {
  const { selectFeature, clearSelection } = useSelectedFeature();

  useMapEvents({
    click: (event) => {
      const clicked = point([event.latlng.lng, event.latlng.lat]);
      const hit = features.find((feature) => booleanPointInPolygon(clicked, feature));

      if (hit) {
        selectFeature({ ...hit, properties: { ...hit.properties, status: 'taken' } });
      } else {
        clearSelection();
      }
    },
  });

  return null;
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
