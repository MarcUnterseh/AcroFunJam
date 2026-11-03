import { fail, ok, type CatalogGateway, type PoseSummary, type Result } from '@acrofunjam/core';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { FakeAuthGateway, renderSite } from '../test/site-harness';

const throne: PoseSummary = {
  id: 'p-1',
  name: 'Throne',
  baseDifficulty: 'beginner',
  flyerDifficulty: 'discovery',
  canStartFlow: true,
  canEndFlow: true,
};

type Answer = Result<readonly PoseSummary[]>;
const unreachable: Answer = fail({ code: 'catalog.unreachable', message: 'Indisponible.' });
const loadingFailed = 'Impossible de charger le catalogue. Vérifie ta connexion Internet, puis réessaie.';

const answering = (answer: Answer): CatalogGateway => ({ listPublishedPoses: async () => answer });
const withPoses = answering(ok([throne]));
const empty = answering(ok([]));
const never: CatalogGateway = { listPublishedPoses: () => new Promise(() => {}) };

/** Answers in turn; an answer can be held back until the test releases it. */
class SuccessiveAnswers implements CatalogGateway {
  private readonly pending: Array<(answer: Answer) => void> = [];
  private readonly answers: Array<Answer | 'held'>;
  constructor(answers: Array<Answer | 'held'>) {
    this.answers = answers;
  }
  listPublishedPoses = () => {
    const next = this.answers.shift()!;
    if (next !== 'held') return Promise.resolve(next);
    return new Promise<Answer>((resolve) => this.pending.push(resolve));
  };
  release(answer: Answer) {
    this.pending.shift()!(answer);
  }
}

const signedIn = (capabilities: Array<'propose' | 'validate-proposals'> = ['propose']) => {
  const gateway = new FakeAuthGateway();
  gateway.account = { email: 'alice@example.org', capabilities };
  return gateway;
};

/** The session is still being checked: /me never answers. */
class CheckingAuthGateway extends FakeAuthGateway {
  override currentAccount = () => new Promise<never>(() => {});
}

const signedInHeader = () =>
  within(screen.getByRole('navigation', { name: 'Compte' })).findByText('alice@example.org');
const proposeLinks = () => screen.queryAllByRole('link', { name: 'Proposer une pose' });
const title = () => screen.getByRole('heading', { level: 1, name: 'Catalogue des poses' });
const follows = (first: Node, second: Node) =>
  Boolean(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING);
const announcements = () => screen.getAllByRole('status').map((status) => status.textContent);

describe('catalog page header', () => {
  it('should offer a person who can propose to do it, right after the title, when the catalog has poses', async () => {
    renderSite('/', { gateway: signedIn(), catalog: withPoses });

    await screen.findByRole('heading', { level: 2, name: 'Throne' });
    await signedInHeader();
    expect(proposeLinks()).toHaveLength(1);
    const link = proposeLinks()[0]!;
    expect(link).toHaveAttribute('href', '/proposer-une-pose');
    expect(follows(title(), link)).toBe(true);
    expect(follows(link, screen.getByText('1 pose, par ordre alphabétique'))).toBe(true);
  });

  it('should not offer a signed-in person without the capability to propose', async () => {
    renderSite('/', { gateway: signedIn([]), catalog: withPoses });

    await screen.findByRole('heading', { level: 2, name: 'Throne' });
    await signedInHeader();
    expect(proposeLinks()).toHaveLength(0);
  });

  it('should not offer a visitor to propose a pose', async () => {
    renderSite('/', { catalog: withPoses });

    await screen.findByRole('heading', { level: 2, name: 'Throne' });
    await screen.findByRole('link', { name: 'Se connecter' });
    expect(proposeLinks()).toHaveLength(0);
  });

  it('should not offer to propose a pose while the session is being checked', async () => {
    renderSite('/', { gateway: new CheckingAuthGateway(), catalog: withPoses });

    await screen.findByRole('heading', { level: 2, name: 'Throne' });
    expect(proposeLinks()).toHaveLength(0);
  });

  it('should not offer to propose a pose before the poses are received, so that the link never moves', async () => {
    renderSite('/', { gateway: signedIn(), catalog: never });

    await signedInHeader();
    expect(screen.getByText('Chargement du catalogue…')).toBeInTheDocument();
    expect(proposeLinks()).toHaveLength(0);
  });

  it('should not offer to propose a pose when the catalog could not be loaded', async () => {
    renderSite('/', { gateway: signedIn(), catalog: answering(unreachable) });

    await screen.findByRole('alert');
    await signedInHeader();
    expect(proposeLinks()).toHaveLength(0);
  });
});

describe('empty catalog', () => {
  it('should invite a person who can propose to propose the first pose, with a single link after the invitation', async () => {
    renderSite('/', { gateway: signedIn(), catalog: empty });

    await signedInHeader();
    const invitation = await screen.findByText('Propose la première pose du catalogue.');
    expect(proposeLinks()).toHaveLength(1);
    expect(follows(screen.getByText('Le catalogue ne contient encore aucune pose.'), invitation)).toBe(true);
    expect(follows(invitation, proposeLinks()[0]!)).toBe(true);
  });

  it('should only tell a visitor that the catalog is empty', async () => {
    renderSite('/', { catalog: empty });

    expect(await screen.findByText('Le catalogue ne contient encore aucune pose.')).toBeInTheDocument();
    await screen.findByRole('link', { name: 'Se connecter' });
    expect(screen.queryByText('Propose la première pose du catalogue.')).not.toBeInTheDocument();
    expect(proposeLinks()).toHaveLength(0);
  });
});

describe('retrying to load the catalog', () => {
  it('should keep the busy button out of the alert, so that "Chargement…" does not make it read again', async () => {
    const catalog = new SuccessiveAnswers([unreachable, 'held']);
    renderSite('/', { catalog });

    await userEvent.click(await screen.findByRole('button', { name: 'Réessayer' }));

    const busy = await screen.findByRole('button', { name: 'Chargement…' });
    expect(screen.getByRole('alert')).toHaveTextContent(loadingFailed);
    expect(screen.getByRole('alert')).not.toContainElement(busy);
  });

  it('should give the focus to the title when the catalog is loaded after retrying', async () => {
    const catalog = new SuccessiveAnswers([unreachable, ok([throne])]);
    renderSite('/', { catalog });

    await userEvent.click(await screen.findByRole('button', { name: 'Réessayer' }));

    await screen.findByRole('heading', { level: 2, name: 'Throne' });
    await waitFor(() => expect(title()).toHaveFocus());
  });

  it('should offer to retry again and announce the failure when retrying fails again', async () => {
    const catalog = new SuccessiveAnswers([unreachable, 'held']);
    renderSite('/', { catalog });
    await userEvent.click(await screen.findByRole('button', { name: 'Réessayer' }));
    await screen.findByRole('button', { name: 'Chargement…' });

    catalog.release(unreachable);

    const retry = await screen.findByRole('button', { name: 'Réessayer' });
    expect(retry).not.toHaveAttribute('aria-disabled');
    await waitFor(() => expect(announcements()).toContain(loadingFailed));
  });
});
