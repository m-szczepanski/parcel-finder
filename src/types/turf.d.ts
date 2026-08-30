declare module '@turf/turf' {
  export function featureCollection(features: any[]): any;
  export function area(feature: any): number;
  export function centroid(feature: any): any;
  export function booleanIntersects(left: any, right: any): boolean;
  export function union(left: any, right: any): any;
  export function difference(left: any, right: any): any;
}
