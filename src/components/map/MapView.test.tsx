import { render } from '@testing-library/react';
import type { Map as LeafletMap } from 'leaflet';
import { DEFAULT_VIEW } from '@/lib/mapState';
import { MapView } from './MapView';

describe('MapView', () => {
  it('exposes the Leaflet map instance via ref, centered on the default view', () => {
    const mapRef: { current: LeafletMap | null } = { current: null };

    render(<MapView ref={mapRef} />);

    const map = mapRef.current;

    expect(map).toBeTruthy();
    expect(map?.getCenter().lat).toBeCloseTo(DEFAULT_VIEW.center[0], 5);
    expect(map?.getCenter().lng).toBeCloseTo(DEFAULT_VIEW.center[1], 5);
    expect(map?.getZoom()).toBe(DEFAULT_VIEW.zoom);
  });

  it('renders OSM attribution on the tile layer', () => {
    const { container } = render(<MapView />);

    const attribution = container.querySelector('.leaflet-control-attribution');

    expect(attribution?.textContent).toContain('OpenStreetMap');
  });
});
