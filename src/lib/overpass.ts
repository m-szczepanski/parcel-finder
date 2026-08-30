import type { ViewportBounds } from '@/types/geo';

export function buildOverpassQuery(bounds: ViewportBounds): string {
  const bbox = `${bounds.south},${bounds.west},${bounds.north},${bounds.east}`;

  return `
    [out:json][timeout:25];
    (
      way["building"](${bbox});
      way["landuse"](${bbox});
      way["natural"](${bbox});
      way["leisure"](${bbox});
    );
    out body geom;
  `.trim();
}

export async function fetchOverpassData(): Promise<{ elements: [] }> {
  return { elements: [] };
}
