export type LandUseType =
  | 'residential'
  | 'commercial'
  | 'industrial'
  | 'grass'
  | 'farmland'
  | 'forest'
  | 'park'
  | 'unknown';

export type CandidateSiteProperties = {
  id: string;
  landuseType: LandUseType;
  area: number;
  centroid?: [number, number];
  address?: string;
  source?: 'overpass';
};

export type CandidateSiteFeature = {
  type: 'Feature';
  id?: string;
  properties: CandidateSiteProperties;
  geometry: {
    type: 'Polygon' | 'MultiPolygon';
    coordinates: number[][][] | number[][][][];
  };
};

export type CandidateSiteFeatureCollection = {
  type: 'FeatureCollection';
  features: CandidateSiteFeature[];
};

export type ViewportBounds = {
  south: number;
  west: number;
  north: number;
  east: number;
};

export type HoveredFeatureState = CandidateSiteFeature | null;
