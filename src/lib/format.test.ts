import { formatArea } from './format';

describe('formatArea', () => {
  it('formats areas below one hectare as square meters', () => {
    expect(formatArea(0)).toBe('0 m²');
    expect(formatArea(2500)).toBe('2,500 m²');
    expect(formatArea(9999)).toBe('9,999 m²');
  });

  it('formats areas of one hectare and above as hectares', () => {
    expect(formatArea(10_000)).toBe('1 ha');
    expect(formatArea(12_500)).toBe('1.25 ha');
    expect(formatArea(1_500_000)).toBe('150 ha');
  });

  it('rounds fractional square meters away in the display', () => {
    expect(formatArea(1234.6)).toBe('1,235 m²');
  });
});
