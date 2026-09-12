import { act, fireEvent } from '@testing-library/react';
import { geoJsonPaths, renderOnMap } from '@/test/leafletLayers';
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

function renderLayer() {
  return renderOnMap(<FreeLandLayer data={COLLECTION} />);
}

describe('FreeLandLayer', () => {
  it('renders one interactive path per candidate feature', () => {
    const { view } = renderLayer();

    expect(view.container.querySelectorAll('path.leaflet-interactive')).toHaveLength(2);
  });

  it('applies the subtle green default style', () => {
    const { view } = renderLayer();

    const path = view.container.querySelector('path.leaflet-interactive');

    expect(path?.getAttribute('stroke')).toBe('#059669');
    expect(path?.getAttribute('fill')).toBe('#10b981');
    expect(path?.getAttribute('fill-opacity')).toBe('0.15');
  });

  it('highlights on hover with the transparent gray style and reverts on mouseout', () => {
    const { mapRef } = renderLayer();
    const path = geoJsonPaths(mapRef.current!)[0];

    path.fire('mouseover');

    expect(path.options.fillColor).toBe('#9ca3af');
    expect(path.options.fillOpacity).toBe(0.3);

    path.fire('mouseout');

    expect(path.options.fillColor).toBe('#10b981');
    expect(path.options.fillOpacity).toBe(0.15);
  });

  it('stores the clicked feature in the selection context and keeps the highlighted style', () => {
    const { mapRef, view } = renderLayer();
    const path = geoJsonPaths(mapRef.current!)[0];

    act(() => {
      path.fire('click');
    });

    expect(view.getByTestId('selection').textContent).toBe('way/1:empty');
    expect(path.options.fillColor).toBe('#34d399');
    expect(path.options.fillOpacity).toBe(0.4);
    expect(path.options.weight).toBe(2);

    // The selected polygon must not revert on mouseout.
    path.fire('mouseout');

    expect(path.options.fillColor).toBe('#34d399');
  });

  it('reverts the previously selected polygon when another one is clicked', () => {
    const { mapRef, view } = renderLayer();
    const [first, second] = geoJsonPaths(mapRef.current!);

    act(() => {
      first.fire('click');
    });
    act(() => {
      second.fire('click');
    });

    expect(view.getByTestId('selection').textContent).toBe('way/2:empty');
    expect(first.options.fillColor).toBe('#10b981');
    expect(second.options.fillColor).toBe('#34d399');
  });

  it('reverts the gray style when the selection is cleared elsewhere', () => {
    const { mapRef, view } = renderLayer();
    const path = geoJsonPaths(mapRef.current!)[0];

    act(() => {
      path.fire('click');
    });
    fireEvent.click(view.getByText('clear'));

    expect(view.getByTestId('selection').textContent).toBe('none');
    expect(path.options.fillColor).toBe('#10b981');
    expect(path.options.fillOpacity).toBe(0.15);
  });
});
