import { useState } from 'react';
import type { Map as LeafletMap } from 'leaflet';
import { MapView } from '@/components/map/MapView';
import { SiteDetails } from '@/components/sidebar/SiteDetails';
import { useViewportData } from '@/hooks/useViewportData';

function App() {
  const [map, setMap] = useState<LeafletMap | null>(null);

  useViewportData(map);

  return (
    <main className="relative h-dvh w-full overflow-hidden">
      <MapView ref={setMap} />
      <SiteDetails />
    </main>
  );
}

export default App;
