import { useMemo, useState } from 'react';
import type { Map as LeafletMap } from 'leaflet';
import { MapView } from '@/components/map/MapView';
import { SiteDetails } from '@/components/sidebar/SiteDetails';
import { useViewportData } from '@/hooks/useViewportData';
import { computeFreeLand } from '@/lib/geometry';

function App() {
  const [map, setMap] = useState<LeafletMap | null>(null);

  const { data } = useViewportData(map);

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
    </main>
  );
}

export default App;
