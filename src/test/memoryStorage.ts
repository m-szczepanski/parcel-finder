import type { StorageLike } from '@/lib/mapState';

export function createMemoryStorage(): StorageLike & Pick<Storage, 'clear'> {
  const store = new Map<string, string>();

  return {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => {
      store.set(key, value);
    },
    clear: () => store.clear(),
  };
}
