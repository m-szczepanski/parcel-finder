import { useRef } from 'react';
import type { Map as LeafletMap } from 'leaflet';
import { MapView } from '@/components/map/MapView';
import { SiteDetails } from '@/components/sidebar/SiteDetails';

function App() {
  const mapRef = useRef<LeafletMap | null>(null);

  return (
    <main className="relative h-dvh w-full overflow-hidden">
      <MapView ref={mapRef} />
      <SiteDetails />
    </main>
  );
}

export default App;
