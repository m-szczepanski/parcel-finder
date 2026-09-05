import { act, fireEvent, render } from '@testing-library/react';
import { latLng } from 'leaflet';
import type { Map as LeafletMap } from 'leaflet';
import { SelectedFeatureProvider, useSelectedFeature } from '@/hooks/useSelectedFeature';
import { DEFAULT_VIEW, saveBasemap, type StorageLike } from '@/lib/mapState';
import type { RawOsmFeature } from '@/types/geo';
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

function SelectionProbe() {
  const { selectedFeature } = useSelectedFeature();

  return (
    <span data-testid="selection">
      {selectedFeature
        ? `${selectedFeature.properties.id}:${selectedFeature.properties.status}`
        : 'none'}
    </span>
  );
}

describe('MapView', () => {
  // The test environment has no localStorage; mapState reads/writes
  // window.localStorage by default, so a memory stand-in is installed here.
  const store = new Map<string, string>();
  const memoryStorage: StorageLike & Pick<Storage, 'clear'> = {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => {
      store.set(key, value);
    },
    clear: () => store.clear(),
  };

  beforeAll(() => {
    Object.defineProperty(window, 'localStorage', { value: memoryStorage });
  });

  beforeEach(() => {
    store.clear();
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

  it('selects a taken site on a bare-map click inside it and clears on a miss', () => {
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

    act(() => {
      map.fire('click', { type: 'click', latlng: latLng(52.15, 21.05) });
    });

    expect(getByTestId('selection').textContent).toBe('way/b-1:taken');

    act(() => {
      map.fire('click', { type: 'click', latlng: latLng(52.15, 21.5) });
    });

    expect(getByTestId('selection').textContent).toBe('none');
  });

  it('switches to the satellite basemap from the toggle and persists the choice', () => {
    window.localStorage.clear();
    const { getByRole, container } = render(
      <SelectedFeatureProvider>
        <MapView />
      </SelectedFeatureProvider>,
    );

    fireEvent.click(getByRole('button', { name: 'Satellite' }));

    const attribution = container.querySelector('.leaflet-control-attribution');

    expect(attribution?.textContent).toContain('Esri');
    expect(window.localStorage.getItem('parcel-finder:basemap')).toBe('satellite');
  });

  it('restores a persisted satellite choice on reload', () => {
    window.localStorage.clear();
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
