import { fireEvent, render, screen } from '@testing-library/react';
import { SelectedFeatureProvider, useSelectedFeature } from '@/hooks/useSelectedFeature';
import type { CandidateSiteFeature } from '@/types/geo';
import { SiteDetails } from './SiteDetails';

const EMPTY_SITE: CandidateSiteFeature = {
  type: 'Feature',
  id: 'way/1',
  properties: {
    id: 'way/1',
    landuseType: 'farmland',
    area: 2500,
    status: 'empty',
    centroid: [21.05, 52.12],
  },
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
};

function Harness({ feature }: { feature: CandidateSiteFeature }) {
  const { selectedFeature, selectFeature } = useSelectedFeature();

  return (
    <div>
      <span data-testid="selection">{selectedFeature?.properties.id ?? 'none'}</span>
      <button type="button" onClick={() => selectFeature(feature)}>
        select
      </button>
      <SiteDetails />
    </div>
  );
}

function renderPanel(feature: CandidateSiteFeature) {
  return render(
    <SelectedFeatureProvider>
      <Harness feature={feature} />
    </SelectedFeatureProvider>,
  );
}

describe('SiteDetails', () => {
  it('stays closed when nothing is selected', () => {
    renderPanel(EMPTY_SITE);

    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('shows the selected empty site with its properties and an OSM link', () => {
    renderPanel(EMPTY_SITE);

    fireEvent.click(screen.getByText('select'));

    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Farmland' })).toBeTruthy();
    expect(screen.getByText('2,500 m²')).toBeTruthy();
    expect(screen.getByText('52.12000, 21.05000')).toBeTruthy();
    expect(screen.getByText('OSM way/1')).toBeTruthy();
    expect(screen.getByText('View on OpenStreetMap').closest('a')?.getAttribute('href')).toBe(
      'https://www.openstreetmap.org/way/1',
    );
  });

  it('closes on the close button and clears the selection', () => {
    renderPanel(EMPTY_SITE);

    fireEvent.click(screen.getByText('select'));
    fireEvent.click(screen.getByText('Close'));

    expect(screen.getByTestId('selection').textContent).toBe('none');
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
