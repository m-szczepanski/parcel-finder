export type OverpassGeometryPoint = {
  lat: number;
  lon: number;
};

export type OverpassElement = {
  type: 'node' | 'way' | 'relation';
  id: number;
  tags?: Record<string, string>;
  geometry?: OverpassGeometryPoint[];
};

export type OverpassResponse = {
  elements: OverpassElement[];
};
