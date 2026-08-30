import { render, screen } from '@testing-library/react';
import App from './App';

describe('App', () => {
  it('renders the scaffold headline', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: /initial project scaffold/i })).toBeTruthy();
  });
});
