import { buildOverpassQuery, fetchOverpassData, overpassToGeoJSON } from './overpass';
import type { OverpassElement } from '@/types/overpass';

const BOUNDS = { south: 52.1, west: 21.05, north: 52.2, east: 21.15 };

const closedBuildingWay: OverpassElement = {
  type: 'way',
  id: 123,
  tags: { building: 'yes' },
  geometry: [
    { lat: 52.23, lon: 21.01 },
    { lat: 52.24, lon: 21.01 },
    { lat: 52.24, lon: 21.02 },
    { lat: 52.23, lon: 21.01 },
  ],
};

describe('buildOverpassQuery', () => {
  it('embeds the bounding box as south,west,north,east', () => {
    const query = buildOverpassQuery({ south: 52.1, west: 21.05, north: 52.2, east: 21.15 });

    expect(query).toContain('(52.1,21.05,52.2,21.15)');
  });

  it('queries building, landuse and only policy-relevant natural/leisure tags', () => {
    const query = buildOverpassQuery({ south: 0, west: 0, north: 1, east: 1 });

    expect(query).toContain('way["building"]');
    expect(query).toContain('way["landuse"]');
    expect(query).toContain('way["natural"~"^(wood|water|scrub|grass|meadow|heath)$"]');
    expect(query).toContain('way["leisure"="park"]');
    expect(query).toContain('way["boundary"="protected_area"]');
    expect(query).not.toContain('way["natural"](');
    expect(query).not.toContain('way["leisure"](');
  });

  it('keeps boundary-tagged protected areas as polygon features', () => {
    const protectedArea: OverpassElement = {
      type: 'way',
      id: 124,
      tags: { boundary: 'protected_area', protect_class: '4' },
      geometry: closedBuildingWay.geometry,
    };

    const { features } = overpassToGeoJSON([protectedArea]);

    expect(features).toHaveLength(1);
    expect(features[0].properties.tags.boundary).toBe('protected_area');
  });
});

describe('overpassToGeoJSON', () => {
  it('converts a closed tagged way into a Polygon feature', () => {
    const { features } = overpassToGeoJSON([closedBuildingWay]);

    expect(features).toHaveLength(1);
    expect(features[0].type).toBe('Feature');
    expect(features[0].geometry.type).toBe('Polygon');
    expect(features[0].geometry.coordinates).toEqual([
      [
        [21.01, 52.23],
        [21.01, 52.24],
        [21.02, 52.24],
        [21.01, 52.23],
      ],
    ]);
  });

  it('keeps the way id and raw tags in feature properties', () => {
    const { features } = overpassToGeoJSON([
      { ...closedBuildingWay, tags: { building: 'house', name: 'Old Barn' } },
    ]);

    expect(features[0].id).toBe('way/123');
    expect(features[0].properties.id).toBe('way/123');
    expect(features[0].properties.tags).toEqual({ building: 'house', name: 'Old Barn' });
  });

  it('skips open ways even when tagged', () => {
    const openWay: OverpassElement = {
      type: 'way',
      id: 456,
      tags: { building: 'yes' },
      geometry: [
        { lat: 52.23, lon: 21.01 },
        { lat: 52.24, lon: 21.01 },
        { lat: 52.24, lon: 21.02 },
      ],
    };

    expect(overpassToGeoJSON([openWay]).features).toHaveLength(0);
  });

  it('skips nodes and relations', () => {
    const node: OverpassElement = { type: 'node', id: 1, tags: { building: 'yes' } };
    const relation: OverpassElement = {
      type: 'relation',
      id: 2,
      tags: { landuse: 'forest' },
    };

    expect(overpassToGeoJSON([node, relation]).features).toHaveLength(0);
  });

  it('skips closed ways without a polygon tag or without tags', () => {
    const untagged: OverpassElement = {
      type: 'way',
      id: 789,
      geometry: closedBuildingWay.geometry,
    };
    const irrelevantTags: OverpassElement = {
      type: 'way',
      id: 790,
      tags: { highway: 'residential' },
      geometry: closedBuildingWay.geometry,
    };

    expect(overpassToGeoJSON([untagged, irrelevantTags]).features).toHaveLength(0);
  });

  it('skips ways without inline geometry', () => {
    const noGeometry: OverpassElement = { type: 'way', id: 3, tags: { building: 'yes' } };

    expect(overpassToGeoJSON([noGeometry]).features).toHaveLength(0);
  });
});

describe('fetchOverpassData', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('GETs the encoded query and returns parsed JSON', async () => {
    const payload = { elements: [] };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => payload,
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await fetchOverpassData(BOUNDS);

    expect(result).toEqual(payload);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain('https://overpass-api.de/api/interpreter?data=');
    expect(url).toContain(encodeURIComponent(buildOverpassQuery(BOUNDS)));
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it('aborts the request when the caller signal fires', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url: unknown, init?: RequestInit) =>
          new Promise<Response>((_, reject) => {
            init?.signal?.addEventListener('abort', () =>
              reject(new DOMException('aborted', 'AbortError')),
            );
          }),
      ),
    );

    const controller = new AbortController();
    const pending = fetchOverpassData(BOUNDS, controller.signal);
    controller.abort();

    await expect(pending).rejects.toThrow('aborted');
  });

  it('throws on a non-retryable response without retrying', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 400, json: async () => ({}) });
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchOverpassData(BOUNDS)).rejects.toThrow('400');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('retries once after a retryable status and succeeds', async () => {
    vi.useFakeTimers();
    try {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce({ ok: false, status: 429, json: async () => ({}) })
        .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ elements: [7] }) });
      vi.stubGlobal('fetch', fetchMock);

      const pending = fetchOverpassData(BOUNDS);
      await vi.advanceTimersByTimeAsync(2_000);

      expect(fetchMock).toHaveBeenCalledTimes(2);
      await expect(pending).resolves.toEqual({ elements: [7] });
    } finally {
      vi.useRealTimers();
    }
  });

  it('retries on the mirror endpoint after a retryable status', async () => {
    vi.useFakeTimers();
    try {
      const urls: string[] = [];
      const fetchMock = vi.fn((url: string) => {
        urls.push(url);
        return Promise.resolve({ ok: false, status: 429, json: async () => ({}) });
      });
      vi.stubGlobal('fetch', fetchMock);

      const pending = fetchOverpassData(BOUNDS);
      const rejection = expect(pending).rejects.toThrow('429');
      await vi.advanceTimersByTimeAsync(2_000);
      await rejection;

      expect(urls).toHaveLength(2);
      expect(urls[0]).toContain('https://overpass-api.de/api/interpreter');
      expect(urls[1]).toContain('https://overpass.kumi.systems/api/interpreter');
    } finally {
      vi.useRealTimers();
    }
  });

  it('gives up after one retry when the failure persists', async () => {
    vi.useFakeTimers();
    try {
      const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 503, json: async () => ({}) });
      vi.stubGlobal('fetch', fetchMock);

      const pending = fetchOverpassData(BOUNDS);
      const rejection = expect(pending).rejects.toThrow('503');
      await vi.advanceTimersByTimeAsync(2_000);

      expect(fetchMock).toHaveBeenCalledTimes(2);
      await rejection;
    } finally {
      vi.useRealTimers();
    }
  });

  it('propagates network/timeout failures', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('timeout')));

    await expect(fetchOverpassData(BOUNDS)).rejects.toThrow('timeout');
  });
});
