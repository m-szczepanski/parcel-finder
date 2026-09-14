import { StrictMode } from 'react';
import { render } from '@testing-library/react';
import App from './App';

describe('App', () => {
  it('renders the map shell and survives a StrictMode double-mount', () => {
    const { container } = render(
      <StrictMode>
        <App />
      </StrictMode>,
    );

    const mapElement = container.querySelector('.leaflet-container');

    expect(mapElement).toBeTruthy();
    expect((mapElement as unknown as { _leaflet_id?: number })._leaflet_id).toBeTruthy();
  });
});
