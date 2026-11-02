import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from './App';

describe('App', () => {
  it('should display the product name when rendered', () => {
    render(<App />);

    expect(screen.getByRole('heading', { level: 1, name: 'AcroFunJam' })).toBeInTheDocument();
  });
});
