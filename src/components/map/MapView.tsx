import { useEffect, useState, type Ref } from 'react';
import { MapContainer, TileLayer, useMapEvents } from 'react-leaflet';
import { booleanPointInPolygon, point } from '@turf/turf';
import type { Map as LeafletMap } from 'leaflet';
import { BasemapToggle } from '@/components/map/BasemapToggle';
import { FreeLandLayer } from '@/components/map/FreeLandLayer';
import { loadBasemap, loadLastView, saveBasemap, saveLastView, type Basemap } from '@/lib/mapState';
import { useSelectedFeature } from '@/hooks/useSelectedFeature';
import type { CandidateSiteFeatureCollection, RawOsmFeature } from '@/types/geo';

const BASEMAPS: Record<Basemap, { url: string; attribution: string }> = {
  osm: {
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution:
      'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
  },
};

const GEOLOCATION_TIMEOUT_MS = 5000;
const GEOLOCATION_MAX_AGE_MS = 60_000;

type MapViewProps = {
  ref?: Ref<LeafletMap>;
  freeLand?: CandidateSiteFeatureCollection;
  dataVersion?: number;
  belowMinZoom?: boolean;
  takenFeatures?: RawOsmFeature[];
};

export function MapView({
  ref,
  freeLand,
  dataVersion = 0,
  belowMinZoom = false,
  takenFeatures = [],
}: MapViewProps) {
  const [initialView] = useState(loadLastView);
  const [basemap, setBasemap] = useState<Basemap>(loadBasemap);

  function handleBasemapChange(next: Basemap) {
    setBasemap(next);
    saveBasemap(next);
  }

  return (
    <MapContainer ref={ref} center={initialView.center} zoom={initialView.zoom} maxZoom={19}>
      {/* react-leaflet does not hot-swap tile URLs, so the layer remounts per basemap. */}
      <TileLayer
        key={basemap}
        attribution={BASEMAPS[basemap].attribution}
        url={BASEMAPS[basemap].url}
      />
      {!belowMinZoom && freeLand && freeLand.features.length > 0 && (
        // react-leaflet's GeoJSON ignores data updates after creation, so the key
        // must change per fetch to force a fresh layer.
        <FreeLandLayer key={dataVersion} data={freeLand} />
      )}
      <TakenSiteCheck features={takenFeatures} />
      <ViewportController />
      <BasemapToggle value={basemap} onChange={handleBasemapChange} />
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
