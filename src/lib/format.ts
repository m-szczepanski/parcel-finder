const HECTARE_M2 = 10_000;

const m2Format = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const hectareFormat = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });

export function formatArea(areaM2: number): string {
  if (areaM2 < HECTARE_M2) {
    return `${m2Format.format(areaM2)} m²`;
  }

  return `${hectareFormat.format(areaM2 / HECTARE_M2)} ha`;
}
