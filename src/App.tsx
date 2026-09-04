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

function App() {
  const [map, setMap] = useState<LeafletMap | null>(null);

  const { data, error, belowMinZoom, version } = useViewportData(map);

  useEffect(() => {
    if (error) {
      // Stable id keeps repeated failures as one toast instead of a stack.
      toast.error('Could not load map data. Move the map to retry.', {
        id: MAP_DATA_ERROR_TOAST_ID,
      });
    }
  }, [error]);

  const { freeLand, takenFeatures } = useMemo(() => computeViewportSites(data), [data]);

  return (
    <SelectedFeatureProvider>
      <main className="relative h-dvh w-full overflow-hidden">
        <MapView
          ref={setMap}
          freeLand={freeLand}
          dataVersion={version}
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
