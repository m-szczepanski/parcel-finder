import { act, fireEvent, render } from '@testing-library/react';
import { latLng } from 'leaflet';
import type { Map as LeafletMap } from 'leaflet';
import { SelectedFeatureProvider } from '@/hooks/useSelectedFeature';
import { DEFAULT_VIEW, saveBasemap } from '@/lib/mapState';
import { geoJsonPaths } from '@/test/leafletLayers';
import { createMemoryStorage } from '@/test/memoryStorage';
import { SelectionProbe } from '@/test/selectionProbe';
import type { CandidateSiteFeatureCollection, RawOsmFeature } from '@/types/geo';
import { MapView } from './MapView';

// Covers [52.1, 21.0] .. [52.2, 21.1]
const TAKEN_BUILDING: RawOsmFeature = {
  type: 'Feature',
  id: 'way/b-1',
  properties: { id: 'way/b-1', tags: { building: 'yes' } },
  geometry: {
    type: 'Polygon',
    coordinates: [
      [
        [21.0, 52.1],
        [21.1, 52.1],
        [21.1, 52.2],
        [21.0, 52.2],
        [21.0, 52.1],
      ],
    ],
  },
};

const FREE_LAND: CandidateSiteFeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      id: 'way/grass-1',
      properties: { id: 'way/grass-1', landuseType: 'grass', area: 1_000_000, status: 'empty' },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [22.0, 53.0],
            [22.1, 53.0],
            [22.1, 53.1],
            [22.0, 53.1],
            [22.0, 53.0],
          ],
        ],
      },
    },
  ],
};

describe('MapView', () => {
  // The test environment has no localStorage; mapState reads/writes
  // window.localStorage by default, so a memory stand-in is installed here.
  const storage = createMemoryStorage();

  beforeAll(() => {
    Object.defineProperty(window, 'localStorage', { value: storage });
  });

  beforeEach(() => {
    storage.clear();
  });

  it('exposes the Leaflet map instance via ref, centered on the default view', () => {
    const mapRef: { current: LeafletMap | null } = { current: null };

    render(
      <SelectedFeatureProvider>
        <MapView
          ref={(map) => {
            mapRef.current = map ?? null;
          }}
        />
      </SelectedFeatureProvider>,
    );

    const map = mapRef.current;

    expect(map).toBeTruthy();
    expect(map?.getCenter().lat).toBeCloseTo(DEFAULT_VIEW.center[0], 5);
    expect(map?.getCenter().lng).toBeCloseTo(DEFAULT_VIEW.center[1], 5);
    expect(map?.getZoom()).toBe(DEFAULT_VIEW.zoom);
  });

  it('renders OSM attribution on the tile layer', () => {
    const { container } = render(
      <SelectedFeatureProvider>
        <MapView />
      </SelectedFeatureProvider>,
    );

    const attribution = container.querySelector('.leaflet-control-attribution');

    expect(attribution?.textContent).toContain('OpenStreetMap');
  });

  it('renders taken features as red paths below the free-land layer', () => {
    const { container } = render(
      <SelectedFeatureProvider>
        <MapView freeLand={FREE_LAND} takenFeatures={[TAKEN_BUILDING]} />
      </SelectedFeatureProvider>,
    );

    // Both layers share one SVG renderer, so DOM order is stacking order:
    // taken first (below), free-land second (on top).
    const paths = container.querySelectorAll('path.leaflet-interactive');

    expect(paths).toHaveLength(2);
    expect(paths[0].getAttribute('stroke')).toBe('#dc2626');
    expect(paths[1].getAttribute('stroke')).toBe('#059669');
  });

  // A real bubbling DOM click goes through Leaflet's own propagation: the layer
  // must consume it (stopPropagation) so the map-level deselect never fires —
  // otherwise the panel would open and instantly close in the browser.
  it('keeps the selection when a real DOM click lands on a taken path', () => {
    const { container, getByTestId } = render(
      <SelectedFeatureProvider>
        <MapView takenFeatures={[TAKEN_BUILDING]} />
        <SelectionProbe />
      </SelectedFeatureProvider>,
    );

    const path = container.querySelector('path.leaflet-interactive');

    expect(path).toBeTruthy();

    act(() => {
      path!.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    });

    expect(getByTestId('selection').textContent).toBe('way/b-1:taken');
  });

  it('keeps the selection when a real DOM click lands on a free-land path', () => {
    const { container, getByTestId } = render(
      <SelectedFeatureProvider>
        <MapView freeLand={FREE_LAND} />
        <SelectionProbe />
      </SelectedFeatureProvider>,
    );

    const path = container.querySelector('path.leaflet-interactive');

    expect(path).toBeTruthy();

    act(() => {
      path!.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    });

    expect(getByTestId('selection').textContent).toBe('way/grass-1:empty');
  });

  it('selects a taken site from the red layer and clears on a bare-map click', () => {
    const mapRef: { current: LeafletMap | null } = { current: null };
    const { getByTestId } = render(
      <SelectedFeatureProvider>
        <MapView
          ref={(map) => {
            mapRef.current = map ?? null;
          }}
          takenFeatures={[TAKEN_BUILDING]}
        />
        <SelectionProbe />
      </SelectedFeatureProvider>,
    );

    const map = mapRef.current!;
    const [taken] = geoJsonPaths(map);

    act(() => {
      taken.fire('click');
    });

    expect(getByTestId('selection').textContent).toBe('way/b-1:taken');

    act(() => {
      map.fire('click', { type: 'click', latlng: latLng(52.15, 21.5) });
    });

    expect(getByTestId('selection').textContent).toBe('none');
  });

  it('switches to the satellite basemap from the toggle and persists the choice', () => {
    const { getByRole, container } = render(
      <SelectedFeatureProvider>
        <MapView />
      </SelectedFeatureProvider>,
    );

    // Clicking the already-active toggle must not persist anything.
    fireEvent.click(getByRole('button', { name: 'Map' }));
    expect(window.localStorage.getItem('parcel-finder:basemap')).toBeNull();

    fireEvent.click(getByRole('button', { name: 'Satellite' }));

    const attribution = container.querySelector('.leaflet-control-attribution');

    expect(attribution?.textContent).toContain('Esri');
    expect(window.localStorage.getItem('parcel-finder:basemap')).toBe('satellite');
  });

  it('restores a persisted satellite choice on reload', () => {
    saveBasemap('satellite');

    const { container } = render(
      <SelectedFeatureProvider>
        <MapView />
      </SelectedFeatureProvider>,
    );

    const attribution = container.querySelector('.leaflet-control-attribution');

    expect(attribution?.textContent).toContain('Esri');
  });
});
