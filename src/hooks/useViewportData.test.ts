import { act, renderHook } from '@testing-library/react';
import type { Map as LeafletMap } from 'leaflet';
import { useViewportData } from './useViewportData';
import type { OverpassElement } from '@/types/overpass';

const DEBOUNCE_MS = 500;

type FakeMap = LeafletMap & {
  setZoom: (zoom: number) => void;
  emit: (event: 'moveend' | 'zoomend') => void;
};

function createFakeMap(zoom: number): FakeMap {
  const listeners = new Map<string, Set<() => void>>();
  let currentZoom = zoom;

  return {
    getZoom: () => currentZoom,
    setZoom: (nextZoom: number) => {
      currentZoom = nextZoom;
    },
    getBounds: () => ({
      getSouth: () => 52.1,
      getWest: () => 21.05,
      getNorth: () => 52.2,
      getEast: () => 21.15,
    }),
    on: (event: string, listener: () => void) => {
      if (!listeners.has(event)) {
        listeners.set(event, new Set());
      }
      listeners.get(event)?.add(listener);
    },
    off: (event: string, listener: () => void) => {
      listeners.get(event)?.delete(listener);
    },
    emit: (event: string) => {
      listeners.get(event)?.forEach((listener) => listener());
    },
  } as unknown as FakeMap;
}

function stubOverpassFetch(payload: unknown = { elements: [] }) {
  const fetchMock = vi.fn(async (): Promise<unknown> => ({
    ok: true,
    status: 200,
    json: async () => payload,
  }));
  vi.stubGlobal('fetch', fetchMock);

  return fetchMock;
}

const closedWay: OverpassElement = {
  type: 'way',
  id: 1,
  tags: { building: 'yes' },
  geometry: [
    { lat: 52.1, lon: 21.05 },
    { lat: 52.2, lon: 21.05 },
    { lat: 52.2, lon: 21.15 },
    { lat: 52.1, lon: 21.05 },
  ],
};

describe('useViewportData', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('fetches once for the settled viewport above min zoom and exposes mapped data', async () => {
    const fetchMock = stubOverpassFetch({ elements: [closedWay] });
    const map = createFakeMap(15);
    const { result } = renderHook(() => useViewportData(map));

    expect(fetchMock).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(DEBOUNCE_MS);
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);

    await act(async () => {});

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.belowMinZoom).toBe(false);
    expect(result.current.data.features).toHaveLength(1);
    expect(result.current.data.features[0].id).toBe('way/1');
  });

  it('does not fetch below min zoom and flags belowMinZoom', () => {
    const fetchMock = stubOverpassFetch();
    const map = createFakeMap(14);
    const { result } = renderHook(() => useViewportData(map));

    act(() => {
      vi.advanceTimersByTime(DEBOUNCE_MS);
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.belowMinZoom).toBe(true);
    expect(result.current.data.features).toHaveLength(0);
  });

  it('clears data and stops fetching once zoom drops below min zoom', async () => {
    const fetchMock = stubOverpassFetch();
    const map = createFakeMap(15);
    const { result } = renderHook(() => useViewportData(map));

    act(() => {
      vi.advanceTimersByTime(DEBOUNCE_MS);
    });
    await act(async () => {});

    expect(fetchMock).toHaveBeenCalledTimes(1);

    act(() => {
      map.setZoom(14);
      map.emit('zoomend');
    });
    act(() => {
      vi.advanceTimersByTime(DEBOUNCE_MS);
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.current.belowMinZoom).toBe(true);
    expect(result.current.data.features).toHaveLength(0);
  });

  it('collapses rapid map moves into a single request per settled move', async () => {
    const fetchMock = stubOverpassFetch();
    const map = createFakeMap(16);
    renderHook(() => useViewportData(map));

    act(() => {
      map.emit('moveend');
      map.emit('zoomend');
      map.emit('moveend');
      vi.advanceTimersByTime(DEBOUNCE_MS);
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);

    act(() => {
      map.emit('moveend');
      vi.advanceTimersByTime(DEBOUNCE_MS);
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);

    await act(async () => {});
  });

  it('ignores stale responses superseded by a newer request', async () => {
    let releaseFirst: (response: unknown) => void = () => {};
    const fetchMock = stubOverpassFetch();
    fetchMock.mockImplementationOnce(
      () =>
        new Promise<unknown>((resolve) => {
          releaseFirst = resolve;
        }),
    );

    const map = createFakeMap(15);
    const { result } = renderHook(() => useViewportData(map));

    act(() => {
      vi.advanceTimersByTime(DEBOUNCE_MS);
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);

    act(() => {
      map.emit('moveend');
      vi.advanceTimersByTime(DEBOUNCE_MS);
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);

    await act(async () => {});

    expect(result.current.loading).toBe(false);
    expect(result.current.data.features).toHaveLength(0);

    act(() => {
      releaseFirst({ ok: true, status: 200, json: async () => ({ elements: [closedWay] }) });
    });
    await act(async () => {});

    expect(result.current.data.features).toHaveLength(0);
  });

  it('exposes fetch failures as an error without throwing', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Promise.reject(new Error('overpass down'))),
    );
    const map = createFakeMap(15);
    const { result } = renderHook(() => useViewportData(map));

    act(() => {
      vi.advanceTimersByTime(DEBOUNCE_MS);
    });
    await act(async () => {});

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.loading).toBe(false);
  });
});
