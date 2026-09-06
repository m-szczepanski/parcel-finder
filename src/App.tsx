import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import type { Map as LeafletMap } from 'leaflet';
import { MapView } from '@/components/map/MapView';
import { SiteDetails } from '@/components/sidebar/SiteDetails';
import { Toaster } from '@/components/ui/sonner';
import { SelectedFeatureProvider } from '@/hooks/useSelectedFeature';
import { useViewportData } from '@/hooks/useViewportData';
import { computeViewportSites } from '@/lib/geometry';

const MAP_DATA_ERROR_TOAST_ID = 'map-data-error';
// After this many consecutive failures assume Overpass is rate-limiting us and
// stop the error-spam — calm message, the backoff does the actual gate-keeping.
const RATE_LIMIT_FAILURE_THRESHOLD = 3;

function App() {
  const [map, setMap] = useState<LeafletMap | null>(null);

  const { data, error, loading, belowMinZoom, failures, version } = useViewportData(map);

  useEffect(() => {
    if (error) {
      const message =
        failures >= RATE_LIMIT_FAILURE_THRESHOLD
          ? 'Overpass seems busy. Waiting a moment before retrying — pan the map to try earlier.'
          : 'Could not load map data. Move the map to retry.';

      // Stable id keeps repeated failures as one toast instead of a stack.
      toast.error(message, {
        id: MAP_DATA_ERROR_TOAST_ID,
      });
    }
  }, [error, failures]);

  const { freeLand, takenFeatures } = useMemo(() => computeViewportSites(data), [data]);

  return (
    <SelectedFeatureProvider>
      <main className="relative h-dvh w-full overflow-hidden">
        <MapView
          ref={setMap}
          freeLand={freeLand}
          dataVersion={version}
          loading={loading}
          belowMinZoom={belowMinZoom}
          takenFeatures={takenFeatures}
        />
        <SiteDetails />
        <Toaster position="bottom-right" />
      </main>
    </SelectedFeatureProvider>
  );
}

export default App;
