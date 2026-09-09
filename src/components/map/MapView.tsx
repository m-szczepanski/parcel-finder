import { useEffect, useState, type Ref } from 'react';
import { MapContainer, TileLayer, useMapEvents } from 'react-leaflet';
import type { Map as LeafletMap } from 'leaflet';
import { BasemapToggle } from '@/components/map/BasemapToggle';
import { FreeLandLayer } from '@/components/map/FreeLandLayer';
import { MapOverlay } from '@/components/map/MapOverlay';
import { TakenSiteLayer } from '@/components/map/TakenSiteLayer';
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
  loading?: boolean;
  belowMinZoom?: boolean;
  takenFeatures?: RawOsmFeature[];
};

export function MapView({
  ref,
  freeLand,
  dataVersion = 0,
  loading = false,
  belowMinZoom = false,
  takenFeatures = [],
}: MapViewProps) {
  const [initialView] = useState(loadLastView);
  const [basemap, setBasemap] = useState<Basemap>(loadBasemap);

  function handleBasemapChange(next: Basemap) {
    if (next === basemap) return;

    setBasemap(next);
    saveBasemap(next);
  }

  const showNoResults =
    !belowMinZoom && !loading && dataVersion > 0 && (freeLand?.features.length ?? 0) === 0;

  return (
    <MapContainer ref={ref} center={initialView.center} zoom={initialView.zoom} maxZoom={19}>
      {/* react-leaflet does not hot-swap tile URLs, so the layer remounts per basemap. */}
      <TileLayer
        key={basemap}
        attribution={BASEMAPS[basemap].attribution}
        url={BASEMAPS[basemap].url}
      />
      {/* The taken layer sits below the free-land layer so green candidates
          stay on top where polygons are adjacent. */}
      {!belowMinZoom && takenFeatures.length > 0 && (
        <TakenSiteLayer key={dataVersion} features={takenFeatures} />
      )}
      {!belowMinZoom && freeLand && freeLand.features.length > 0 && (
        // react-leaflet's GeoJSON ignores data updates after creation, so the key
        // must change per fetch to force a fresh layer.
        <FreeLandLayer key={dataVersion} data={freeLand} />
      )}
      <DeselectOnMapClick />
      <ViewportController />
      <BasemapToggle value={basemap} onChange={handleBasemapChange} />
      <MapOverlay loading={loading} belowMinZoom={belowMinZoom} showNoResults={showNoResults} />
    </MapContainer>
  );
}

// A click no polygon layer consumed is a bare-map click: the panel closes.
// Polygon layers stop propagation on their own clicks (tech doc 3.3).
function DeselectOnMapClick() {
  const { clearSelection } = useSelectedFeature();

  useMapEvents({
    click: () => clearSelection(),
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
