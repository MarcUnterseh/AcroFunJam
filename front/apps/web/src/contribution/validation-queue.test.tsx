import { fail, ok, type PoseName } from '@acrofunjam/core';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { aPendingProposal, FakeAuthGateway, FakeValidationGateway, renderSite } from '../test/site-harness';

const validator = () => {
  const gateway = new FakeAuthGateway();
  gateway.account = { email: 'bruno@example.org', capabilities: ['propose', 'validate-proposals'] };
  return gateway;
};

const openQueue = (validation: FakeValidationGateway) =>
  renderSite('/propositions-a-valider', { gateway: validator(), validation });

const star = aPendingProposal({
  id: 'proposal-star',
  pose: {
    name: 'Star' as PoseName,
    baseDifficulty: 'intermediate',
    flyerDifficulty: 'intermediate',
    canStartFlow: true,
    canEndFlow: true,
  },
  submittedAt: new Date('2026-11-04T09:00:00Z'),
});

describe('page « Propositions à valider »', () => {
  it('should tell the queue is loading, and nothing else, until it is received', async () => {
    const validation = new FakeValidationGateway();
    validation.queue.set('held');
    openQueue(validation);

    expect(await screen.findByText('Chargement des propositions…')).toHaveAttribute('role', 'status');
    expect(screen.queryByText(/Vérifie chaque proposition/)).not.toBeInTheDocument();
  });

  it('should introduce the queue, tell how many proposals are pending, and list them in the order received', async () => {
    openQueue(new FakeValidationGateway(aPendingProposal(), star));

    const list = await screen.findByRole('list');
    expect(screen.getByText(/^Vérifie chaque proposition de pose ou de modification/)).toBeInTheDocument();
    expect(
      screen.getByText('2 propositions en attente, de la plus ancienne à la plus récente'),
    ).toBeInTheDocument();
    const names = within(list)
      .getAllByRole('article')
      .map((card) => within(card).getByRole('heading', { level: 2 }).textContent);
    expect(names).toEqual(['Throne', 'Star']);
  });

  it('should present the pose of a proposal as in the catalog, with its contributor and its date', async () => {
    openQueue(
      new FakeValidationGateway(
        aPendingProposal({ pose: { ...aPendingProposal().pose, canEndFlow: false } }),
      ),
    );

    const card = await screen.findByRole('article', { name: 'Throne' });
    expect(within(card).getByText(/^Proposée par/)).toHaveTextContent(
      'Proposée par alice@example.org le 3 novembre 2026',
    );
    const terms = within(card)
      .getAllByRole('term')
      .map((term) => term.textContent);
    const values = within(card)
      .getAllByRole('definition')
      .map((value) => value.textContent);
    expect(terms).toEqual(['Base', 'Flyer', 'Peut commencer un flow', 'Peut terminer un flow']);
    expect(values).toEqual(['Débutant', 'Découverte', 'Oui', 'Non']);
  });

  it('should present the own proposal of the validator as made by « toi »', async () => {
    openQueue(
      new FakeValidationGateway(
        aPendingProposal({ contributor: { email: 'bruno@example.org', isYou: true } }),
      ),
    );

    const card = await screen.findByRole('article', { name: 'Throne' });
    expect(within(card).getByText(/^Proposée par/)).toHaveTextContent('Proposée par toi le 3 novembre 2026');
  });

  it('should not emphasise a deleted account as it would an address', async () => {
    openQueue(new FakeValidationGateway(aPendingProposal({ contributor: { email: null, isYou: false } })));

    const card = await screen.findByRole('article', { name: 'Throne' });
    const line = within(card).getByText(/^Proposée par/);
    expect(line).toHaveTextContent('Proposée par un compte supprimé le 3 novembre 2026');
    expect(line.querySelector('strong')).toBeNull();
  });

  it('should offer the three decisions, of equal weight, in order', async () => {
    openQueue(new FakeValidationGateway(aPendingProposal()));

    const card = await screen.findByRole('article', { name: 'Throne' });
    const buttons = within(card).getAllByRole('button');
    expect(buttons.map((button) => button.textContent)).toEqual([
      'Accepter et publier',
      'Ajuster avant de publier',
      'Refuser',
    ]);
    for (const button of buttons) expect(button).toHaveClass('button--secondary');
  });

  it('should say no proposal is pending, and offer to see the catalog, when the queue is empty', async () => {
    openQueue(new FakeValidationGateway());

    expect(await screen.findByText("Aucune proposition n'est en attente de validation.")).toBeInTheDocument();
    expect(screen.getByText('Tu es à jour.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Voir le catalogue' })).toHaveAttribute('href', '/');
    expect(screen.queryByText(/en attente, de la plus ancienne/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Vérifie chaque proposition/)).not.toBeInTheDocument();
  });

  it('should tell the queue could not be loaded and offer to retry', async () => {
    const validation = new FakeValidationGateway(aPendingProposal());
    validation.queue.set(fail({ kind: 'unreachable' }), ok([aPendingProposal()]));
    openQueue(validation);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Impossible de charger les propositions. Vérifie ta connexion Internet, puis réessaie.',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Réessayer' }));

    expect(await screen.findByRole('article', { name: 'Throne' })).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 1, name: 'Propositions à valider' })).toHaveFocus(),
    );
  });

  it('should ask to reload the page, not to retry, when the site is outdated', async () => {
    const validation = new FakeValidationGateway();
    validation.queue.set(fail({ kind: 'outdated' }));
    openQueue(validation);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Impossible de charger les propositions : le site doit être mis à jour. Recharge la page.',
    );
    expect(screen.getByRole('button', { name: 'Recharger la page' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Réessayer' })).not.toBeInTheDocument();
  });

  it('should tell the validator whose role was withdrawn that the queue is no longer theirs', async () => {
    const validation = new FakeValidationGateway();
    validation.queue.set(fail({ kind: 'forbidden' }));
    openQueue(validation);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Tu ne peux plus accepter ni refuser de proposition : ton rôle a changé.',
    );
    expect(screen.getByRole('link', { name: 'Revenir au catalogue' })).toHaveAttribute('href', '/');
  });
});
