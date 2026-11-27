import { fail, ok, type LinkedTransition, type PosePage } from '@acrofunjam/core';
import { QueryClient } from '@tanstack/react-query';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { CurrentLocation, FakeAuthGateway, FakePosePageGateway, renderSite } from '../test/site-harness';

// Story 7: the page of a pose (docs/design/ecrans/7-proposer-une-transition.md, element-transition.md).

const throneToBird: LinkedTransition = {
  id: 't-throne-bird',
  otherPose: { id: 'pose-bird', name: 'Bird' },
  name: null,
  baseDifficulty: 'beginner',
  flyerDifficulty: 'beginner',
  description: null,
  tags: [],
  videos: [],
};

const birdToThrone: LinkedTransition = {
  id: 't-bird-throne',
  otherPose: { id: 'pose-bird', name: 'Bird' },
  name: 'Retour',
  baseDifficulty: 'beginner',
  flyerDifficulty: 'discovery',
  description: 'Le flyer redescend en Throne.\nSans à-coup.',
  tags: [],
  videos: [],
};

const throne = (overrides: Partial<PosePage> = {}): PosePage => ({
  id: 'pose-throne',
  name: 'Throne',
  baseDifficulty: 'beginner',
  flyerDifficulty: 'discovery',
  canStartFlow: true,
  canEndFlow: false,
  tags: [],
  pendingRevision: false,
  transitionsFrom: [throneToBird],
  transitionsTo: [birdToThrone],
  ...overrides,
});

const signedIn = () => {
  const gateway = new FakeAuthGateway();
  gateway.account = { email: 'alice@example.org' };
  return gateway;
};

const open = (
  page = new FakePosePageGateway(ok(throne())),
  options: Parameters<typeof renderSite>[1] = {},
) => {
  const view = renderSite(
    '/poses/pose-throne',
    { posePage: page, queryClient: new QueryClient(), ...options },
    <CurrentLocation />,
  );
  return { ...view, user: userEvent.setup() };
};

const section = (name: string) => screen.getByRole('region', { name });
const items = (name: string) => within(section(name)).getAllByRole('listitem');

describe('the page of a pose', () => {
  it('should present the pose: a link back to the catalog, its name as title and its characteristics', async () => {
    open();

    expect(await screen.findByRole('heading', { level: 1, name: 'Throne' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Catalogue' })).toHaveAttribute('href', '/');
    const main = within(screen.getByRole('main'));
    const terms = main.getAllByRole('term').map((term) => term.textContent);
    expect(terms.slice(0, 4)).toEqual(['Base', 'Flyer', 'Peut commencer un flow', 'Peut terminer un flow']);
    expect(
      main
        .getAllByRole('definition')
        .map((value) => value.textContent)
        .slice(0, 4),
    ).toEqual(['Débutant', 'Découverte', 'Oui', 'Non']);
    expect(document.title).toBe('Throne – AcroFunJam');
  });

  it('should read the page of the pose of the address', async () => {
    const page = new FakePosePageGateway(ok(throne()));
    open(page);

    await screen.findByRole('heading', { level: 1, name: 'Throne' });
    expect(page.read).toEqual(['pose-throne']);
  });

  it('should remind the difficulty scale, then the warning about the falls during transitions', async () => {
    open();

    await screen.findByRole('heading', { level: 1, name: 'Throne' });
    expect(screen.getByRole('list', { name: /^Niveaux de difficulté/ })).toBeInTheDocument();
    expect(
      screen.getByText(
        'Tu restes juge de tes limites. Les chutes arrivent surtout pendant les transitions : apprends-les avec un spotter.',
      ),
    ).toBeInTheDocument();
  });

  it('should present the transitions from the pose, each with its arrival pose, a link to its page, its difficulties', async () => {
    open();

    await screen.findByRole('heading', { level: 1, name: 'Throne' });
    const [item] = items('Transitions depuis Throne');
    const transition = within(item!);
    expect(transition.getByText('Vers')).toBeInTheDocument();
    expect(transition.getByRole('link', { name: 'Bird' })).toHaveAttribute('href', '/poses/pose-bird');
    expect(transition.getAllByRole('term').map((term) => term.textContent)).toEqual(['Base', 'Flyer']);
    expect(transition.getAllByRole('definition').map((value) => value.textContent)).toEqual([
      'Débutant',
      'Débutant',
    ]);
  });

  it('should present the transitions to the pose with their departure pose, name and description', async () => {
    open();

    await screen.findByRole('heading', { level: 1, name: 'Throne' });
    const [item] = items('Transitions vers Throne');
    const transition = within(item!);
    expect(transition.getByRole('heading', { level: 3, name: 'Retour' })).toBeInTheDocument();
    expect(transition.getByText('Depuis')).toBeInTheDocument();
    expect(transition.getByRole('link', { name: 'Bird' })).toHaveAttribute('href', '/poses/pose-bird');
    // The line breaks of the description are kept (Q105): plain text, never a link.
    const description = transition.getByText(/^Le flyer redescend en Throne\./);
    expect(description.textContent).toBe('Le flyer redescend en Throne.\nSans à-coup.');
  });

  it('should present a transition without a name by its poses, read « de Throne vers Bird »', async () => {
    open();

    await screen.findByRole('heading', { level: 1, name: 'Throne' });
    const [item] = items('Transitions depuis Throne');
    const title = within(item!).getByRole('heading', { level: 3, name: 'de Throne vers Bird' });
    const shown = title.querySelector('[aria-hidden="true"]');
    expect(shown?.textContent).toBe('ThroneBird');
    expect(shown?.querySelector('svg')).not.toBeNull();
  });

  it('should mark the other pose of a washing machine as the same pose, in both sections', async () => {
    const ninjaStar: LinkedTransition = {
      ...throneToBird,
      otherPose: { id: 'pose-throne', name: 'Throne' },
      name: 'Ninja Throne',
    };
    open(new FakePosePageGateway(ok(throne({ transitionsFrom: [ninjaStar], transitionsTo: [ninjaStar] }))));

    await screen.findByRole('heading', { level: 1, name: 'Throne' });
    for (const name of ['Transitions depuis Throne', 'Transitions vers Throne']) {
      const [item] = items(name);
      expect(within(item!).getByText('(même pose)')).toBeInTheDocument();
      expect(within(item!).getByRole('link', { name: 'Throne' })).toHaveAttribute(
        'href',
        '/poses/pose-throne',
      );
    }
  });

  it('should tell, section by section, that no transition starts from or arrives at the pose', async () => {
    open(new FakePosePageGateway(ok(throne({ transitionsFrom: [], transitionsTo: [] }))));

    await screen.findByRole('heading', { level: 1, name: 'Throne' });
    expect(
      within(section('Transitions depuis Throne')).getByText(
        "Aucune transition ne part de Throne pour l'instant.",
      ),
    ).toBeInTheDocument();
    expect(
      within(section('Transitions vers Throne')).getByText(
        "Aucune transition n'arrive à Throne pour l'instant.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole('listitem', { name: /Transition/ })).not.toBeInTheDocument();
  });

  it('should tell the pose is loading, without a title yet', async () => {
    open(new FakePosePageGateway('held'));

    expect(await screen.findByText('Chargement de la pose…')).toHaveAttribute('role', 'status');
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Catalogue' })).toBeInTheDocument();
  });

  it('should present the page « Pose introuvable » for a pose that is not in the catalog', async () => {
    open(new FakePosePageGateway(fail({ kind: 'not-found' })));

    expect(await screen.findByRole('heading', { level: 1, name: 'Pose introuvable' })).toBeInTheDocument();
    expect(screen.getByText("Cette pose n'est pas dans le catalogue.")).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Voir le catalogue' })).toHaveAttribute('href', '/');
  });

  it('should tell the page could not be loaded, then load it on « Réessayer »', async () => {
    const page = new FakePosePageGateway(fail({ kind: 'unreachable' }), ok(throne()));
    const { user } = open(page);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Impossible de charger la pose. Vérifie ta connexion Internet, puis réessaie.',
    );
    await user.click(screen.getByRole('button', { name: 'Réessayer' }));

    const title = await screen.findByRole('heading', { level: 1, name: 'Throne' });
    await waitFor(() => expect(title).toHaveFocus());
  });

  it('should not invite a visitor to propose anything', async () => {
    open();

    await screen.findByRole('heading', { level: 1, name: 'Throne' });
    await screen.findByRole('link', { name: 'Se connecter' });
    expect(screen.queryByRole('link', { name: /^Proposer/ })).not.toBeInTheDocument();
  });

  it('should invite a signed-in person to propose a transition from the pose, then a modification of it', async () => {
    open(undefined, { gateway: signedIn() });

    const transition = await screen.findByRole('link', { name: 'Proposer une transition depuis Throne' });
    expect(transition).toHaveAttribute('href', '/poses/pose-throne/proposer-une-transition');
    expect(screen.getByRole('link', { name: 'Proposer une modification' })).toHaveAttribute(
      'href',
      '/poses/pose-throne/proposer-une-modification',
    );
  });
});
