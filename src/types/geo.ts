import type { Position } from 'geojson';

export type LandUseType =
  | 'residential'
  | 'commercial'
  | 'industrial'
  | 'grass'
  | 'farmland'
  | 'forest'
  | 'water'
  | 'park'
  | 'cemetery'
  | 'quarry'
  | 'unknown';

export type CandidateSiteProperties = {
  id: string;
  landuseType: LandUseType;
  area: number;
  status: 'empty';
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

export type RawOsmFeatureProperties = {
  id: string;
  tags: Record<string, string>;
};

export type RawOsmFeature = {
  type: 'Feature';
  id: string;
  properties: RawOsmFeatureProperties;
  geometry: {
    type: 'Polygon';
    coordinates: Position[][];
  };
};

// A raw OSM polygon selected through the map-level taken-site check: the raw
// properties (tags drive the panel content) plus the discriminating status.
export type TakenSiteFeature = {
  type: 'Feature';
  id: string;
  properties: RawOsmFeatureProperties & { status: 'taken' };
  geometry: RawOsmFeature['geometry'];
};

export type RawOsmFeatureCollection = {
  type: 'FeatureCollection';
  features: RawOsmFeature[];
};

export type ViewportBounds = {
  south: number;
  west: number;
  north: number;
  east: number;
};

export type SelectedFeatureState = CandidateSiteFeature | TakenSiteFeature | null;
