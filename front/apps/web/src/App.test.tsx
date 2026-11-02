import { ok } from '@acrofunjam/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from './App';
import { CatalogGatewayProvider } from './catalog/CatalogGatewayContext';

describe('App', () => {
  it('should display the product name when rendered', () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <CatalogGatewayProvider gateway={{ listPublishedPoses: async () => ok([]) }}>
          <App />
        </CatalogGatewayProvider>
      </QueryClientProvider>,
    );

    expect(screen.getByRole('heading', { level: 1, name: 'AcroFunJam' })).toBeInTheDocument();
  });
});
