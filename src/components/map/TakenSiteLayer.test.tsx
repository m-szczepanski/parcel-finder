import { act, fireEvent } from '@testing-library/react';
import { geoJsonPaths, renderOnMap } from '@/test/leafletLayers';
import type { RawOsmFeature } from '@/types/geo';
import { TakenSiteLayer } from './TakenSiteLayer';

const FEATURES: RawOsmFeature[] = [
  {
    type: 'Feature',
    id: 'way/b-1',
    properties: { id: 'way/b-1', tags: { building: 'yes' } },
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
    id: 'way/wood-1',
    properties: { id: 'way/wood-1', tags: { natural: 'wood' } },
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
];

function renderLayer() {
  return renderOnMap(<TakenSiteLayer features={FEATURES} />);
}

describe('TakenSiteLayer', () => {
  it('renders one path per taken feature', () => {
    const { view } = renderLayer();

    expect(view.container.querySelectorAll('path.leaflet-interactive')).toHaveLength(2);
  });

  it('applies the subtle red default style', () => {
    const { view } = renderLayer();

    const path = view.container.querySelector('path.leaflet-interactive');

    expect(path?.getAttribute('stroke')).toBe('#dc2626');
    expect(path?.getAttribute('fill')).toBe('#ef4444');
    expect(path?.getAttribute('fill-opacity')).toBe('0.15');
  });

  it('selects the feature as taken on click and shows the highlighted style', () => {
    const { mapRef, view } = renderLayer();
    const [building, wood] = geoJsonPaths(mapRef.current!);

    act(() => {
      building.fire('click');
    });

    expect(view.getByTestId('selection').textContent).toBe('way/b-1:taken');
    expect(building.options.fillColor).toBe('#f87171');
    expect(building.options.fillOpacity).toBe(0.4);
    expect(building.options.weight).toBe(2);

    act(() => {
      wood.fire('click');
    });

    expect(view.getByTestId('selection').textContent).toBe('way/wood-1:taken');
    expect(building.options.fillColor).toBe('#ef4444');
    expect(wood.options.fillColor).toBe('#f87171');
  });

  it('reverts the highlighted style when the selection is cleared elsewhere', () => {
    const { mapRef, view } = renderLayer();
    const path = geoJsonPaths(mapRef.current!)[0];

    act(() => {
      path.fire('click');
    });
    fireEvent.click(view.getByText('clear'));

    expect(view.getByTestId('selection').textContent).toBe('none');
    expect(path.options.fillColor).toBe('#ef4444');
    expect(path.options.fillOpacity).toBe(0.15);
    expect(path.options.weight).toBe(1);
  });

  it('keeps the red style on hover — no hover effect for taken sites', () => {
    const { mapRef } = renderLayer();
    const path = geoJsonPaths(mapRef.current!)[0];

    path.fire('mouseover');
    path.fire('mouseout');

    expect(path.options.fillColor).toBe('#ef4444');
    expect(path.options.fillOpacity).toBe(0.15);
  });
});
