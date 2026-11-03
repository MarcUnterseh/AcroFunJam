import { fail, ok, type CatalogGateway, type PoseSummary } from '@acrofunjam/core';
import { onlineManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CatalogGatewayProvider } from './CatalogGatewayContext';
import { CatalogPage } from './CatalogPage';

const pose = (name: string): PoseSummary => ({
  id: `id-${name}`,
  name,
  baseDifficulty: 'beginner',
  flyerDifficulty: 'discovery',
  canStartFlow: true,
  canEndFlow: true,
});

const renderWithGateway = (
  gateway: CatalogGateway,
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } }),
) =>
  render(
    <QueryClientProvider client={queryClient}>
      <CatalogGatewayProvider gateway={gateway}>
        <CatalogPage />
      </CatalogGatewayProvider>
    </QueryClientProvider>,
  );

const unreachable = fail({
  code: 'catalog.unreachable',
  message: 'Le catalogue est momentanément indisponible.',
});

describe('CatalogPage, loading failures', () => {
  afterEach(() => {
    onlineManager.setOnline(true);
    vi.restoreAllMocks();
  });

  it('should keep the cards already displayed, without message, when a refresh in the background fails', async () => {
    const answers = [ok([pose('Throne')]), unreachable];
    const queryClient = new QueryClient();
    renderWithGateway({ listPublishedPoses: async () => answers.shift()! }, queryClient);
    await screen.findByRole('heading', { level: 2, name: 'Throne' });

    await act(async () => {
      await queryClient.refetchQueries();
      await new Promise((resolve) => setTimeout(resolve, 10)); // lets React Query notify the page
    });
    expect(queryClient.getQueryState(['catalog', 'poses'])?.status).toBe('error');

    expect(screen.getByRole('list', { name: 'Poses du catalogue' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('should report the failure at once when the browser believes it is offline', async () => {
    onlineManager.setOnline(false);

    renderWithGateway({ listPublishedPoses: async () => unreachable }, new QueryClient());

    expect(await screen.findByRole('alert')).toHaveTextContent('Impossible de charger le catalogue.');
  });

  it('should show the same message, and trace the code, when the catalog answers unexpectedly', async () => {
    const trace = vi.spyOn(console, 'error').mockImplementation(() => {});

    renderWithGateway({
      listPublishedPoses: async () =>
        fail({
          code: 'catalog.unexpected-response',
          message: 'Le catalogue a renvoyé une réponse inattendue.',
        }),
    });

    expect(await screen.findByRole('alert')).toHaveTextContent('Impossible de charger le catalogue.');
    expect(trace).toHaveBeenCalledWith(expect.stringContaining('catalog.unexpected-response'));
  });

  it('should not trace an unreachable catalog, which is expected', async () => {
    const trace = vi.spyOn(console, 'error').mockImplementation(() => {});

    renderWithGateway({ listPublishedPoses: async () => unreachable });

    await screen.findByRole('alert');
    expect(trace).not.toHaveBeenCalled();
  });
});

describe('CatalogPage', () => {
  it('should display the published poses provided by the catalog gateway when loaded', async () => {
    renderWithGateway({ listPublishedPoses: async () => ok([pose('Throne')]) });

    expect(await screen.findByRole('heading', { level: 2, name: 'Throne' })).toBeInTheDocument();
  });

  it('should announce the number of poses and their order when the catalog has poses', async () => {
    renderWithGateway({
      listPublishedPoses: async () => ok([pose('Bird'), pose('High Bird'), pose('Throne')]),
    });

    expect(await screen.findByText('3 poses, par ordre alphabétique')).toBeInTheDocument();
  });

  it('should present the ordered difficulty scale, then the responsibility warning, before the cards', async () => {
    renderWithGateway({ listPublishedPoses: async () => ok([pose('Throne')]) });

    const scale = await screen.findByRole('list', {
      name: 'Niveaux de difficulté, du plus accessible au plus exigeant :',
    });
    expect(
      within(scale)
        .getAllByRole('listitem')
        .map((level) => level.textContent),
    ).toEqual(['Découverte', 'Débutant', 'Intermédiaire', 'Avancé']);
    const warning = screen.getByText(
      'Tu restes juge de tes limites : pratique à ton niveau et prévois un spotter quand tu en as besoin.',
    );
    const cards = screen.getByRole('list', { name: 'Poses du catalogue' });
    expect(scale.compareDocumentPosition(warning) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(warning.compareDocumentPosition(cards) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('should inform the visitor that the catalog has no pose yet when the list is empty', async () => {
    renderWithGateway({ listPublishedPoses: async () => ok([]) });

    expect(await screen.findByText('Le catalogue ne contient encore aucune pose.')).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Poses du catalogue' })).not.toBeInTheDocument();
  });

  it('should tell that the catalog is loading while the poses are not received', () => {
    renderWithGateway({ listPublishedPoses: () => new Promise(() => {}) });

    expect(screen.getByRole('status')).toHaveTextContent('Chargement du catalogue…');
    expect(screen.queryByText(/par ordre alphabétique/)).not.toBeInTheDocument();
  });

  it('should tell that the catalog could not be loaded and offer to retry, without count, legend nor cards', async () => {
    renderWithGateway({ listPublishedPoses: async () => unreachable });

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(
      'Impossible de charger le catalogue. Vérifie ta connexion Internet, puis réessaie.',
    );
    expect(screen.getByRole('button', { name: 'Réessayer' })).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('should report the failure at once, without retrying on its own, even with the default query options', async () => {
    let calls = 0;
    render(
      <QueryClientProvider client={new QueryClient()}>
        <CatalogGatewayProvider
          gateway={{
            listPublishedPoses: async () => {
              calls += 1;
              return unreachable;
            },
          }}
        >
          <CatalogPage />
        </CatalogGatewayProvider>
      </QueryClientProvider>,
    );

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(calls).toBe(1);
  });

  it('should load the catalog again, showing that it is busy, when the visitor retries', async () => {
    let answer: (result: Awaited<ReturnType<CatalogGateway['listPublishedPoses']>>) => void = () => {};
    const answers = [
      Promise.resolve(unreachable),
      new Promise<Awaited<ReturnType<CatalogGateway['listPublishedPoses']>>>((resolve) => (answer = resolve)),
    ];
    renderWithGateway({ listPublishedPoses: () => answers.shift()! });

    await userEvent.click(await screen.findByRole('button', { name: 'Réessayer' }));

    const busy = await screen.findByRole('button', { name: 'Chargement…' });
    expect(busy).toHaveAttribute('aria-disabled', 'true');
    answer(ok([pose('Throne')]));
    expect(await screen.findByRole('heading', { level: 2, name: 'Throne' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
