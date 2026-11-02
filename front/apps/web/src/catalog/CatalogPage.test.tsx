import { fail, ok, type CatalogGateway, type PoseSummary } from '@acrofunjam/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CatalogGatewayProvider } from './CatalogGatewayContext';
import { CatalogPage } from './CatalogPage';

const renderWithGateway = (gateway: CatalogGateway) =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <CatalogGatewayProvider gateway={gateway}>
        <CatalogPage />
      </CatalogGatewayProvider>
    </QueryClientProvider>,
  );

describe('CatalogPage', () => {
  it('should display the published poses provided by the catalog gateway when loaded', async () => {
    const throne: PoseSummary = {
      id: 'p-1',
      name: 'Throne',
      baseDifficulty: 'beginner',
      flyerDifficulty: 'discovery',
    };

    renderWithGateway({ listPublishedPoses: async () => ok([throne]) });

    expect(await screen.findByRole('cell', { name: 'Throne' })).toBeInTheDocument();
  });

  it('should inform the visitor that the catalog has no pose yet when the list is empty', async () => {
    renderWithGateway({ listPublishedPoses: async () => ok([]) });

    expect(await screen.findByText('Le catalogue ne contient encore aucune pose.')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('should inform the visitor when the catalog is unavailable', async () => {
    renderWithGateway({
      listPublishedPoses: async () =>
        fail({ code: 'catalog.unreachable', message: 'Le catalogue est momentanément indisponible.' }),
    });

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Le catalogue est momentanément indisponible.',
    );
  });
});
