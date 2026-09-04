import { render } from '@testing-library/react';
import { MapContainer } from 'react-leaflet';
import type { CandidateSiteFeatureCollection } from '@/types/geo';
import { FreeLandLayer } from './FreeLandLayer';

const COLLECTION: CandidateSiteFeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      id: 'way/1',
      properties: { id: 'way/1', landuseType: 'grass', area: 1200, status: 'empty' },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [21.0, 52.1],
            [21.1, 52.1],
            [21.1, 52.2],
            [21.0, 52.2],
            [21.0, 52.1],
          ],
        ],
      },
    },
    {
      type: 'Feature',
      id: 'way/2',
      properties: { id: 'way/2', landuseType: 'farmland', area: 3000, status: 'empty' },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [21.2, 52.1],
            [21.3, 52.1],
            [21.3, 52.2],
            [21.2, 52.2],
            [21.2, 52.1],
          ],
        ],
      },
    },
  ],
};

describe('FreeLandLayer', () => {
  it('renders one interactive path per candidate feature', () => {
    const { container } = render(
      <MapContainer center={[52.15, 21.05]} zoom={15}>
        <FreeLandLayer data={COLLECTION} />
      </MapContainer>,
    );

    expect(container.querySelectorAll('path.leaflet-interactive')).toHaveLength(2);
  });

  it('applies the subtle green default style', () => {
    const { container } = render(
      <MapContainer center={[52.15, 21.05]} zoom={15}>
        <FreeLandLayer data={COLLECTION} />
      </MapContainer>,
    );

    const path = container.querySelector('path.leaflet-interactive');

    expect(path?.getAttribute('stroke')).toBe('#059669');
    expect(path?.getAttribute('fill')).toBe('#10b981');
    expect(path?.getAttribute('fill-opacity')).toBe('0.15');
  });
});
