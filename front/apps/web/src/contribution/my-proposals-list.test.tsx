import { fail, ok, type AdjustmentNote, type MyProposal, type PoseName, type RejectionReason } from '@acrofunjam/core';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { aMyProposal, FakeAuthGateway, FakeContributionGateway, renderSite } from '../test/site-harness';

const signedIn = (email = 'alice@example.org') => {
  const gateway = new FakeAuthGateway();
  gateway.account = { email };
  return gateway;
};

const openMyProposals = (contribution: FakeContributionGateway, gateway = signedIn()) =>
  renderSite('/mes-propositions', { gateway, contribution });

const withProposals = (...proposals: MyProposal[]) => {
  const contribution = new FakeContributionGateway();
  contribution.myProposals.set(ok(proposals));
  return contribution;
};

const star = aMyProposal({
  id: 'proposal-star',
  pose: { ...aMyProposal().pose, name: 'Star' as PoseName },
  submittedAt: new Date('2026-11-01T09:00:00Z'),
});

const names = () =>
  within(screen.getByRole('list'))
    .getAllByRole('article')
    .map((card) => within(card).getByRole('heading', { level: 2 }).textContent);

/** Texts of the status regions: the site announcer among them. */
const announcements = () => screen.getAllByRole('status').map((status) => status.textContent);
const loadingFailed = 'Impossible de charger tes propositions. Vérifie ta connexion Internet, puis réessaie.';

const card = (name: string) => screen.findByRole('article', { name });
/** The paragraph of the status, whole (its « Statut : » is a visually hidden span). */
const statusOf = (article: HTMLElement) =>
  within(article).getByText(
    (_, element) => element?.tagName === 'P' && /^Statut( :| indisponible)/.test(element.textContent ?? ''),
  );

describe('page « Mes propositions »', () => {
  it('should tell the proposals are loading, and nothing else, until they are received', async () => {
    const contribution = new FakeContributionGateway();
    contribution.myProposals.set('held');
    openMyProposals(contribution);

    expect(await screen.findByText('Chargement de tes propositions…')).toHaveAttribute('role', 'status');
    expect(screen.queryByText(/^Retrouve les poses/)).not.toBeInTheDocument();
  });

  it('should introduce the list, tell how many proposals there are and list them in the order received', async () => {
    openMyProposals(withProposals(aMyProposal(), star));

    await screen.findByRole('list');
    expect(
      screen.getByText("Retrouve les poses que tu as proposées et ce qu'elles sont devenues."),
    ).toBeInTheDocument();
    expect(screen.getByText('2 propositions, de la plus récente à la plus ancienne')).toBeInTheDocument();
    expect(names()).toEqual(['Throne', 'Star']);
  });

  // Two proposals of the same name (a pose proposed again after a rejection): the date tells them apart.
  it('should describe each card by its submission date, to tell apart two proposals of the same name', async () => {
    openMyProposals(withProposals(aMyProposal(), { ...star, pose: aMyProposal().pose }));

    const [recent, older] = await screen.findAllByRole('article', { name: 'Throne' });
    expect(recent).toHaveAccessibleDescription('Proposée le 3 novembre 2026');
    expect(older).toHaveAccessibleDescription('Proposée le 1 novembre 2026');
  });

  it('should present a pending proposal: its date, its status and what follows, then the proposed pose', async () => {
    openMyProposals(withProposals(aMyProposal({ pose: { ...aMyProposal().pose, canEndFlow: false } })));

    const throne = await card('Throne');
    const submitted = within(throne).getByText(/^Proposée le/);
    expect(submitted).toHaveTextContent('Proposée le 3 novembre 2026');
    expect(submitted.querySelector('time')).toHaveAttribute('datetime', '2026-11-03T09:00:00.000Z');
    expect(statusOf(throne)).toHaveTextContent('Statut : En attente de validation');
    expect(within(throne).getByText('Statut :')).toHaveClass('visually-hidden');
    expect(
      within(throne).getByText('Elle apparaîtra dans le catalogue une fois acceptée.'),
    ).toBeInTheDocument();
    expect(throne.querySelector('.my-proposal-status--neutral svg')).toHaveAttribute('aria-hidden', 'true');
    expect(within(throne).getAllByRole('definition').map((value) => value.textContent)).toEqual([
      'Débutant',
      'Découverte',
      'Oui',
      'Non',
    ]);
  });

  const decidedAt = new Date('2026-11-05T10:00:00Z');

  const adjusted = (message: string | null) =>
    aMyProposal({
      pose: { ...aMyProposal().pose, flyerDifficulty: 'discovery' },
      status: {
        kind: 'accepted-with-adjustments',
        decidedAt,
        adjustments: [
          { field: 'name', proposed: 'throne' as PoseName, retained: 'Throne' as PoseName },
          { field: 'flyerDifficulty', proposed: 'intermediate', retained: 'discovery' },
        ],
        message: message as AdjustmentNote | null,
      },
    });

  it('should present the retained pose and each adjusted value of a proposal accepted with adjustments', async () => {
    openMyProposals(withProposals(adjusted(null)));

    const throne = await card('Throne');
    expect(statusOf(throne)).toHaveTextContent('Statut : Acceptée avec ajustements le 5 novembre 2026');
    expect(
      within(throne).getByText('Elle est publiée dans le catalogue avec ces ajustements.'),
    ).toBeInTheDocument();
    const title = within(throne).getByRole('heading', { level: 3, name: 'Ajustements apportés' });
    expect(title).not.toHaveAttribute('tabindex');
    const terms = within(throne).getAllByRole('term').map((term) => term.textContent);
    const values = within(throne).getAllByRole('definition').map((value) => value.textContent);
    expect(terms.slice(0, 2)).toEqual(['Nom de la pose', 'Difficulté flyer']);
    expect(values.slice(0, 2)).toEqual([
      'Proposé : throne, retenu : Throne',
      'Proposé : Intermédiaire, retenu : Découverte',
    ]);
    expect(within(throne).getByText('Les autres valeurs sont celles que tu as proposées.')).toBeInTheDocument();
    expect(within(throne).queryByText("Message d'ajustement")).not.toBeInTheDocument();
  });

  it('should present the adjustment note of the validator after the adjustments, without quoting it', async () => {
    openMyProposals(withProposals(adjusted('Throne se découvre dès la première séance côté flyer.')));

    const throne = await card('Throne');
    const label = within(throne).getByText("Message d'ajustement");
    const message = within(throne).getByText('Throne se découvre dès la première séance côté flyer.');
    expect(label.nextElementSibling).toBe(message);
    expect(throne.querySelector('blockquote')).toBeNull();
  });

  // A rejection is no fault of the person: information, never danger.
  it('should present a rejection and its reason in the information tone, with the proposed pose', async () => {
    const reason = 'Doublon de Bird, déjà au catalogue.' as RejectionReason;
    openMyProposals(withProposals(aMyProposal({ status: { kind: 'rejected', decidedAt, reason } })));

    const throne = await card('Throne');
    expect(statusOf(throne)).toHaveTextContent('Statut : Refusée le 5 novembre 2026');
    expect(within(throne).getByText("Elle n'est pas publiée dans le catalogue.")).toBeInTheDocument();
    expect(throne.querySelector('.my-proposal-status--information')).not.toBeNull();
    expect(throne.querySelector('[class*="danger"]')).toBeNull();
    expect(within(throne).getByText('Motif du refus').nextElementSibling).toHaveTextContent(reason);
  });

  it.each([
    [{ kind: 'accepted', decidedAt } as const, 'Statut : Acceptée le 5 novembre 2026'],
    [{ kind: 'published-directly' } as const, 'Statut : Publiée directement'],
  ])('should say a pose %o is published in the catalog', async (status, text) => {
    openMyProposals(withProposals(aMyProposal({ status })));

    const throne = await card('Throne');
    expect(statusOf(throne)).toHaveTextContent(text);
    expect(within(throne).getByText('Elle est publiée dans le catalogue.')).toBeInTheDocument();
    expect(throne.querySelector('.my-proposal-status--success')).not.toBeNull();
  });

  it('should ask to reload the page in the card whose status cannot be read only', async () => {
    openMyProposals(withProposals(aMyProposal({ status: { kind: 'unknown' } }), star));

    const throne = await card('Throne');
    expect(statusOf(throne)).toHaveTextContent(/^Statut indisponible\. Recharge la page\.$/);
    expect(statusOf(await card('Star'))).toHaveTextContent('Statut : En attente de validation');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  // Q12: neither the address of the validator nor « toi », whatever the decision.
  it('should never designate the validator who decided', async () => {
    const reason = 'Doublon de Bird, déjà au catalogue.' as RejectionReason;
    openMyProposals(
      withProposals(adjusted('Merci !'), { ...star, status: { kind: 'rejected', decidedAt, reason } }),
    );

    const list = await screen.findByRole('list');
    expect(list).not.toHaveTextContent(/@|\btoi\b|par /);
  });

  it('should say nothing was proposed yet, and invite to propose a pose, when there is no proposal', async () => {
    openMyProposals(withProposals());

    expect(await screen.findByText("Tu n'as encore proposé aucune pose.")).toBeInTheDocument();
    expect(
      screen.getByText("Les poses que tu proposes apparaissent ici, avec ce qu'elles deviennent."),
    ).toBeInTheDocument();
    const link = screen.getByRole('link', { name: 'Proposer une pose' });
    expect(link).toHaveAttribute('href', '/proposer-une-pose');
    expect(link).toHaveClass('button--primary');
    expect(screen.queryByText(/^Retrouve les poses/)).not.toBeInTheDocument();
    expect(screen.queryByText(/de la plus récente/)).not.toBeInTheDocument();
  });

  // An incident never looks like an empty list.
  it('should tell the proposals could not be loaded and offer to retry, then present them', async () => {
    const contribution = new FakeContributionGateway();
    contribution.myProposals.set(fail({ kind: 'unreachable' }), ok([aMyProposal()]));
    openMyProposals(contribution);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Impossible de charger tes propositions. Vérifie ta connexion Internet, puis réessaie.',
    );
    expect(screen.queryByText("Tu n'as encore proposé aucune pose.")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Réessayer' }));

    expect(await card('Throne')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 1, name: 'Mes propositions' })).toHaveFocus(),
    );
  });

  // Not a network failure: the alert of the outdated site tells it; the button is gone, the focus goes to the title.
  it('should ask to reload the page, without announcing a network failure, when retrying finds the site outdated', async () => {
    const contribution = new FakeContributionGateway();
    contribution.myProposals.set(fail({ kind: 'unreachable' }), fail({ kind: 'outdated' }));
    openMyProposals(contribution);
    await userEvent.click(await screen.findByRole('button', { name: 'Réessayer' }));

    expect(await screen.findByRole('button', { name: 'Recharger la page' })).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 1, name: 'Mes propositions' })).toHaveFocus(),
    );
    expect(announcements()).not.toContain(loadingFailed);
  });

  // The page tells the expired session (its own block, announced): no network failure, the focus on the title.
  it('should tell the session expired, without announcing a network failure, when retrying finds it expired', async () => {
    const gateway = signedIn();
    const contribution = new FakeContributionGateway();
    contribution.myProposals.set(fail({ kind: 'unreachable' }), fail({ kind: 'unauthenticated' }));
    openMyProposals(contribution, gateway);
    await userEvent.click(await screen.findByRole('button', { name: 'Réessayer' }));
    gateway.account = null;

    expect(await within(screen.getByRole('main')).findByText('Ta session a expiré.')).toBeInTheDocument();
    await waitFor(() => expect(announcements()).toContain('Ta session a expiré. Tu peux te reconnecter.'));
    expect(screen.getByRole('heading', { level: 1, name: 'Mes propositions' })).toHaveFocus();
    expect(announcements()).not.toContain(loadingFailed);
  });

  it('should ask to reload the page, not to retry, when the site is outdated', async () => {
    const contribution = new FakeContributionGateway();
    contribution.myProposals.set(fail({ kind: 'outdated' }));
    openMyProposals(contribution);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Impossible de charger tes propositions : le site doit être mis à jour. Recharge la page.',
    );
    expect(screen.getByRole('button', { name: 'Recharger la page' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Réessayer' })).not.toBeInTheDocument();
  });
});
