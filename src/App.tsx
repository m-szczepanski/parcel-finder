import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import type { Map as LeafletMap } from 'leaflet';
import { MapView } from '@/components/map/MapView';
import { SiteDetails } from '@/components/sidebar/SiteDetails';
import { Toaster } from '@/components/ui/sonner';
import { useViewportData } from '@/hooks/useViewportData';
import { computeFreeLand } from '@/lib/geometry';

const MAP_DATA_ERROR_TOAST_ID = 'map-data-error';

function App() {
  const [map, setMap] = useState<LeafletMap | null>(null);

  const { data, error } = useViewportData(map);

  useEffect(() => {
    if (error) {
      // Stable id keeps repeated failures as one toast instead of a stack.
      toast.error('Could not load map data. Move the map to retry.', {
        id: MAP_DATA_ERROR_TOAST_ID,
      });
    }
  }, [error]);

  // Temporary manual-test wiring for step 03 — replaced by the FreeLandLayer in step 04.
  const debugFreeLand = useMemo(() => {
    const buildings = data.features.filter((feature) => 'building' in feature.properties.tags);
    const landuse = data.features.filter((feature) => !('building' in feature.properties.tags));

    return {
      key: Date.now(),
      data: computeFreeLand(
        { type: 'FeatureCollection', features: landuse },
        { type: 'FeatureCollection', features: buildings },
      ),
    };
  }, [data]);

  return (
    <main className="relative h-dvh w-full overflow-hidden">
      <MapView ref={setMap} freeLand={debugFreeLand} />
      <SiteDetails />
      <Toaster position="bottom-right" />
    </main>
  );
}

export default App;
