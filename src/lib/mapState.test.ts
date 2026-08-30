import { DEFAULT_VIEW, loadLastView, saveLastView, type StorageLike } from './mapState';

const STORAGE_KEY = 'parcel-finder:last-view';

function createMemoryStorage(): StorageLike & { clear: () => void } {
  const store = new Map<string, string>();

  return {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => {
      store.set(key, value);
    },
    clear: () => store.clear(),
  };
}

describe('mapState', () => {
  const storage = createMemoryStorage();

  beforeEach(() => {
    storage.clear();
  });

  it('returns the default view when nothing is stored', () => {
    expect(loadLastView(storage)).toEqual(DEFAULT_VIEW);
  });

  it('round-trips a saved view', () => {
    saveLastView({ center: [50.06, 19.94], zoom: 16 }, storage);

    expect(loadLastView(storage)).toEqual({ center: [50.06, 19.94], zoom: 16 });
  });

  it('falls back to the default view on invalid JSON', () => {
    storage.setItem(STORAGE_KEY, 'not-json');

    expect(loadLastView(storage)).toEqual(DEFAULT_VIEW);
  });

  it('falls back to the default view on out-of-range data', () => {
    storage.setItem(STORAGE_KEY, JSON.stringify({ center: [999, 21], zoom: 15 }));
    expect(loadLastView(storage)).toEqual(DEFAULT_VIEW);

    storage.setItem(STORAGE_KEY, JSON.stringify({ center: [52.23, 21.01], zoom: 42 }));
    expect(loadLastView(storage)).toEqual(DEFAULT_VIEW);
  });
});
