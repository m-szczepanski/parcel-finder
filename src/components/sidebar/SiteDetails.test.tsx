import { centroid, area as turfArea } from '@turf/turf';
import { fireEvent, render, screen } from '@testing-library/react';
import { SelectedFeatureProvider, useSelectedFeature } from '@/hooks/useSelectedFeature';
import { formatArea } from '@/lib/format';
import type { CandidateSiteFeature, TakenSiteFeature } from '@/types/geo';
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

const TAKEN_BUILDING: TakenSiteFeature = {
  type: 'Feature',
  id: 'way/9',
  properties: { id: 'way/9', status: 'taken', tags: { building: 'yes' } },
  geometry: {
    type: 'Polygon',
    coordinates: [
      [
        [21.0, 52.1],
        [21.001, 52.1],
        [21.001, 52.101],
        [21.0, 52.101],
        [21.0, 52.1],
      ],
    ],
  },
};

const TAKEN_FOREST: TakenSiteFeature = {
  ...TAKEN_BUILDING,
  id: 'way/10',
  properties: { id: 'way/10', status: 'taken', tags: { natural: 'wood' } },
};

function Harness({ feature }: { feature: CandidateSiteFeature | TakenSiteFeature }) {
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

function renderPanel(feature: CandidateSiteFeature | TakenSiteFeature) {
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
    expect(screen.getByText('Heuristic approximation, not a cadastral or legal source.')).toBeTruthy();
  });

  it('closes on the close button and clears the selection', () => {
    renderPanel(EMPTY_SITE);

    fireEvent.click(screen.getByText('select'));
    fireEvent.click(screen.getByText('Close'));

    expect(screen.getByTestId('selection').textContent).toBe('none');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('shows a taken notice naming the occupier above the property rows', () => {
    renderPanel(TAKEN_BUILDING);

    fireEvent.click(screen.getByText('select'));

    expect(screen.getByRole('heading', { name: 'Taken site' })).toBeTruthy();
    expect(screen.getByText('Building')).toBeTruthy();
    // No Land use row — the notice carries the type for taken sites.
    expect(screen.queryByText('Land use')).toBeNull();
    // Area and coordinates are derived from the raw geometry.
    expect(screen.getByText(formatArea(turfArea(TAKEN_BUILDING)))).toBeTruthy();
    const [longitude, latitude] = centroid(TAKEN_BUILDING).geometry.coordinates;
    expect(screen.getByText(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`)).toBeTruthy();
    expect(screen.getByText('OSM way/9')).toBeTruthy();
    expect(screen.getByText('Heuristic approximation, not a cadastral or legal source.')).toBeTruthy();
  });

  it('names taken land from its land-use tags', () => {
    renderPanel(TAKEN_FOREST);

    fireEvent.click(screen.getByText('select'));

    expect(screen.getByText('Forest')).toBeTruthy();
  });
});
