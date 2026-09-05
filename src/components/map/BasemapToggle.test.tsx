import { fireEvent, render, screen } from '@testing-library/react';
import { BasemapToggle } from './BasemapToggle';

describe('BasemapToggle', () => {
  it('marks the active basemap as pressed', () => {
    render(<BasemapToggle value="osm" onChange={() => undefined} />);

    expect(screen.getByRole('button', { name: 'Map' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: 'Satellite' }).getAttribute('aria-pressed')).toBe(
      'false',
    );
  });

  it('reports the picked basemap', () => {
    const onChange = vi.fn();
    render(<BasemapToggle value="osm" onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Satellite' }));

    expect(onChange).toHaveBeenCalledWith('satellite');
  });
});
