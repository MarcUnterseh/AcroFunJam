import { fail, ok, type PoseName } from '@acrofunjam/core';
import { QueryClient } from '@tanstack/react-query';
import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import {
  aPendingProposal,
  FakeAuthGateway,
  FakeValidationGateway,
  MemoryDecisionInputStore,
  renderSite,
} from '../test/site-harness';

const bruno = 'bruno@example.org';

const validator = () => {
  const gateway = new FakeAuthGateway();
  gateway.account = { email: bruno, capabilities: ['propose', 'validate-proposals'] };
  return gateway;
};

const openQueue = async (
  validation: FakeValidationGateway = new FakeValidationGateway(aPendingProposal()),
  options: Parameters<typeof renderSite>[1] = {},
) => {
  const view = renderSite('/propositions-a-valider', {
    gateway: validator(),
    validation,
    queryClient: new QueryClient(),
    ...options,
  });
  const card = await screen.findByRole('article', { name: 'Throne' });
  return { ...view, card, user: userEvent.setup() };
};

const star = () => {
  const proposal = aPendingProposal({ id: 'proposal-star' });
  return { ...proposal, pose: { ...proposal.pose, name: 'Star' as PoseName } };
};

const button = (card: HTMLElement, name: string) => within(card).getByRole('button', { name });
const decisionButtons = (card: HTMLElement) =>
  within(card).queryAllByRole('button', { name: /^(Accepter et publier|Ajuster avant de publier|Refuser)$/ });
const announcements = () => screen.getAllByRole('status').map((status) => status.textContent);
const report = (name: RegExp | string) => screen.findByRole('heading', { level: 2, name });

describe('accepting a proposal as proposed', () => {
  it('should send the acceptance at once, without adjustment, showing it is busy until the API answers', async () => {
    const validation = new FakeValidationGateway(aPendingProposal());
    validation.acceptance.set('held');
    const { card, user } = await openQueue(validation);

    await user.click(button(card, 'Accepter et publier'));
    await user.click(button(card, 'Publication…'));

    expect(validation.accepted).toEqual([
      { id: 'proposal-throne', acceptance: { adjustments: [], note: null } },
    ]);
    expect(button(card, 'Publication…')).toHaveAttribute('aria-disabled', 'true');
    expect(button(card, 'Refuser')).toHaveAttribute('aria-disabled', 'true');
  });

  it('should replace the card by a report, its title focused, with a link to the catalog', async () => {
    const { card, user } = await openQueue();

    await user.click(button(card, 'Accepter et publier'));

    const title = await report('La pose « Throne » est publiée dans le catalogue.');
    await waitFor(() => expect(title).toHaveFocus());
    expect(title.closest('li')).toContainElement(screen.getByRole('link', { name: 'Voir le catalogue' }));
    expect(screen.queryByRole('article', { name: 'Throne' })).not.toBeInTheDocument();
  });

  it('should take the decided proposal off the number of the header', async () => {
    const validation = new FakeValidationGateway(aPendingProposal(), star());
    const { card, user } = await openQueue(validation);
    const link = screen.getByRole('link', { name: /^Propositions à valider/ });
    await waitFor(() => expect(link).toHaveAccessibleName('Propositions à valider (2 en attente)'));

    await user.click(button(card, 'Accepter et publier'));

    await waitFor(() => expect(link).toHaveAccessibleName('Propositions à valider (1 en attente)'));
    expect(validation.countRequests).toBe(1);
  });

  it('should tell in the card that the name is taken, keeping the decisions', async () => {
    const validation = new FakeValidationGateway(aPendingProposal());
    validation.acceptance.set(fail({ kind: 'name-already-in-catalog' }));
    const { card, user } = await openQueue(validation);

    await user.click(button(card, 'Accepter et publier'));

    expect(await within(card).findByRole('alert')).toHaveTextContent(
      'Une pose de ce nom existe déjà dans le catalogue.',
    );
    expect(decisionButtons(card)).toHaveLength(3);
  });

  it('should tell in the card that the proposal was already decided, and no longer offer to decide', async () => {
    const validation = new FakeValidationGateway(aPendingProposal());
    validation.acceptance.set(fail({ kind: 'already-decided' }));
    const { card, user } = await openQueue(validation);

    await user.click(button(card, 'Accepter et publier'));

    expect(await within(card).findByRole('alert')).toHaveTextContent('Cette proposition a déjà été traitée.');
    expect(decisionButtons(card)).toHaveLength(0);
  });

  it('should tell in the card that the proposal is no longer pending, and no longer offer to decide', async () => {
    const validation = new FakeValidationGateway(aPendingProposal());
    validation.acceptance.set(fail({ kind: 'not-found' }));
    const { card, user } = await openQueue(validation);

    await user.click(button(card, 'Accepter et publier'));

    expect(await within(card).findByRole('alert')).toHaveTextContent(
      "Cette proposition n'est plus en attente de validation.",
    );
    expect(decisionButtons(card)).toHaveLength(0);
  });

  it.each(['already-decided', 'not-found', 'forbidden'] as const)(
    'should give the focus to the name of the proposal when its decisions disappear (%s)',
    async (kind) => {
      const validation = new FakeValidationGateway(aPendingProposal());
      validation.acceptance.set(fail({ kind }));
      const { card, user } = await openQueue(validation);

      await user.click(button(card, 'Accepter et publier'));

      await within(card).findByRole('alert');
      await waitFor(() => expect(within(card).getByRole('heading', { level: 2, name: 'Throne' })).toHaveFocus());
    },
  );

  it.each(['already-decided', 'not-found'] as const)(
    'should read the number of the header again when the proposal was no longer pending (%s)',
    async (kind) => {
      const validation = new FakeValidationGateway(aPendingProposal(), star());
      validation.acceptance.set(fail({ kind }));
      const { card, user } = await openQueue(validation);
      const link = screen.getByRole('link', { name: /^Propositions à valider/ });
      await waitFor(() => expect(link).toHaveAccessibleName('Propositions à valider (2 en attente)'));
      validation.count.set(ok(1));

      await user.click(button(card, 'Accepter et publier'));

      await waitFor(() => expect(link).toHaveAccessibleName('Propositions à valider (1 en attente)'));
      expect(validation.countRequests).toBe(2);
    },
  );

  it('should ask to reload the page when the site is outdated', async () => {
    const validation = new FakeValidationGateway(aPendingProposal());
    validation.acceptance.set(fail({ kind: 'outdated' }));
    const { card, user } = await openQueue(validation);

    await user.click(button(card, 'Accepter et publier'));

    const alert = await within(card).findByRole('alert');
    expect(alert).toHaveTextContent(
      "Ta décision n'a pas pu être envoyée : le site doit être mis à jour. Recharge la page, puis réessaie.",
    );
    expect(within(alert).getByRole('button', { name: 'Recharger la page' })).toBeInTheDocument();
    expect(within(alert).queryByRole('button', { name: 'Réessayer' })).not.toBeInTheDocument();
  });

  it('should tell the validator whose role was withdrawn, offering the way back to the catalog', async () => {
    const validation = new FakeValidationGateway(aPendingProposal());
    validation.acceptance.set(fail({ kind: 'forbidden' }));
    const { card, user } = await openQueue(validation);

    await user.click(button(card, 'Accepter et publier'));

    const alert = await within(card).findByRole('alert');
    expect(alert).toHaveTextContent(
      'Tu ne peux plus accepter ni refuser de proposition : ton rôle a changé.',
    );
    expect(within(alert).getByRole('link', { name: 'Revenir au catalogue' })).toHaveAttribute('href', '/');
    expect(decisionButtons(card)).toHaveLength(0);
  });

  it('should offer to retry when AcroFunJam cannot be reached', async () => {
    const validation = new FakeValidationGateway(aPendingProposal());
    validation.acceptance.set(fail({ kind: 'unreachable' }), ok({ name: 'Throne', adjusted: false }));
    const { card, user } = await openQueue(validation);
    await user.click(button(card, 'Accepter et publier'));
    const alert = await within(card).findByRole('alert');
    expect(alert).toHaveTextContent(/impossible de joindre AcroFunJam/);

    await user.click(within(alert).getByRole('button', { name: 'Réessayer' }));

    expect(await report('La pose « Throne » est publiée dans le catalogue.')).toBeInTheDocument();
    expect(validation.accepted).toHaveLength(2);
  });

  it('should not say an input is kept when the validator had typed nothing', async () => {
    const validation = new FakeValidationGateway(aPendingProposal());
    validation.acceptance.set(fail({ kind: 'unreachable' }));
    const { card, user } = await openQueue(validation);

    await user.click(button(card, 'Accepter et publier'));

    expect(await within(card).findByRole('alert')).toHaveTextContent(
      /^Ta décision n'a pas pu être envoyée : impossible de joindre AcroFunJam\. Vérifie ta connexion Internet, puis réessaie\.Réessayer$/,
    );
  });

  it('should tell in the card that the session expired, offering to sign in again and come back, without the banner', async () => {
    const validation = new FakeValidationGateway(aPendingProposal());
    validation.acceptance.set(fail({ kind: 'unauthenticated' }));
    const { card, user } = await openQueue(validation);

    await user.click(button(card, 'Accepter et publier'));

    const alert = await within(card).findByRole('alert');
    expect(alert).toHaveTextContent('Ta session a expiré.');
    expect(within(alert).getByRole('link', { name: 'Se connecter' })).toHaveAttribute(
      'href',
      '/connexion?retour=%2Fpropositions-a-valider',
    );
    expect(screen.getByRole('article', { name: 'Throne' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Session expirée' })).not.toBeInTheDocument();
  });

  it('should take each decided proposal off the line under the title, until every one is decided', async () => {
    const validation = new FakeValidationGateway(aPendingProposal(), star());
    validation.acceptance.set(ok({ name: 'Throne', adjusted: false }), ok({ name: 'Star', adjusted: false }));
    const { card, user } = await openQueue(validation);

    await user.click(button(card, 'Accepter et publier'));
    expect(await screen.findByText('1 proposition en attente')).not.toHaveAttribute('role');

    await user.click(button(screen.getByRole('article', { name: 'Star' }), 'Accepter et publier'));
    expect(await screen.findByText('Toutes les propositions de la liste sont traitées.')).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 2, name: /est publiée dans le catalogue/ })).toHaveLength(2);
  });

  it('should remove the alert of the expired session when the validator is signed in again (another tab)', async () => {
    const validation = new FakeValidationGateway(aPendingProposal());
    validation.acceptance.set(fail({ kind: 'unauthenticated' }));
    const { card, user, queryClient } = await openQueue(validation);
    await user.click(button(card, 'Accepter et publier'));
    await within(card).findByRole('alert');

    // The session is read again (another tab, focus): /me knows the validator again.
    await act(() => queryClient.invalidateQueries({ queryKey: ['session'] }));

    await waitFor(() => expect(within(card).queryByRole('alert')).not.toBeInTheDocument());
    expect(decisionButtons(card)).toHaveLength(3);
  });

  it('should keep the other cards usable and in place', async () => {
    const validation = new FakeValidationGateway(aPendingProposal(), star());
    const { card, user } = await openQueue(validation);

    await user.click(button(card, 'Accepter et publier'));
    await report(/« Throne »/);

    expect(decisionButtons(screen.getByRole('article', { name: 'Star' }))).toHaveLength(3);
  });
});

describe('rejecting a proposal', () => {
  const reasonField = (card: HTMLElement) => within(card).getByRole('textbox', { name: 'Motif du refus' });

  it('should ask for the reason in the card, in place of the other decisions', async () => {
    const { card, user } = await openQueue();

    await user.click(button(card, 'Refuser'));

    expect(reasonField(card)).toHaveFocus();
    expect(reasonField(card)).toHaveAccessibleDescription(
      'Le contributeur verra ce motif. 500 caractères au maximum.',
    );
    expect(within(card).queryByRole('button', { name: 'Accepter et publier' })).not.toBeInTheDocument();
    expect(within(card).queryByRole('button', { name: 'Ajuster avant de publier' })).not.toBeInTheDocument();
    expect(button(card, 'Confirmer le refus')).toHaveClass('button--primary');
    expect(button(card, 'Annuler')).toBeInTheDocument();
  });

  it('should require a reason, sending nothing, the field focused', async () => {
    const validation = new FakeValidationGateway(aPendingProposal());
    const { card, user } = await openQueue(validation);
    await user.click(button(card, 'Refuser'));
    await user.type(reasonField(card), '   ');

    await user.click(button(card, 'Confirmer le refus'));

    expect(reasonField(card)).toHaveAccessibleDescription(
      'Le contributeur verra ce motif. 500 caractères au maximum. Saisis le motif du refus.',
    );
    expect(reasonField(card)).toHaveAttribute('aria-invalid', 'true');
    expect(reasonField(card)).toHaveFocus();
    expect(validation.rejected).toEqual([]);
  });

  it('should show a counter near the limit', async () => {
    const { card, user } = await openQueue();
    await user.click(button(card, 'Refuser'));

    await user.click(reasonField(card));
    await user.paste('x'.repeat(462));

    expect(within(card).getByText('462 / 500 caractères')).toBeInTheDocument();
  });

  it('should announce the counter of the reason when it appears and when the limit is passed, not on each keystroke', async () => {
    const { card, user } = await openQueue();
    await user.click(button(card, 'Refuser'));
    await user.click(reasonField(card));

    await user.paste('x'.repeat(462));
    expect(announcements()).toContain('462 / 500 caractères');
    await user.paste('x'.repeat(39));
    expect(announcements()).toContain('501 / 500 caractères : 1 de trop');
    expect(within(card).getByText('501 / 500 caractères : 1 de trop')).not.toHaveAttribute('aria-live');
  });

  it('should send the normalised reason, then replace the card by the report of the rejection', async () => {
    const validation = new FakeValidationGateway(aPendingProposal());
    const { card, user } = await openQueue(validation);
    await user.click(button(card, 'Refuser'));
    await user.type(reasonField(card), "  Ce n'est pas   une pose tenable. ");

    await user.click(button(card, 'Confirmer le refus'));

    const title = await report('La proposition « Throne » est refusée.');
    await waitFor(() => expect(title).toHaveFocus());
    expect(screen.getByText('Le contributeur verra ton motif.')).toBeInTheDocument();
    expect(validation.rejected).toEqual([
      { id: 'proposal-throne', reason: "Ce n'est pas une pose tenable." },
    ]);
  });

  it('should go back to the decisions, the focus on « Refuser », when the validator cancels', async () => {
    const { card, user } = await openQueue();
    await user.click(button(card, 'Refuser'));

    await user.click(button(card, 'Annuler'));

    expect(decisionButtons(card)).toHaveLength(3);
    expect(button(card, 'Refuser')).toHaveFocus();
  });

  it('should keep the reason, in the card and in the tab, when AcroFunJam cannot be reached', async () => {
    const validation = new FakeValidationGateway(aPendingProposal());
    validation.rejection.set(fail({ kind: 'unreachable' }));
    const decisionStore = new MemoryDecisionInputStore();
    const { card, user } = await openQueue(validation, { decisionStore });
    await user.click(button(card, 'Refuser'));
    await user.type(reasonField(card), "Ce n'est pas une pose tenable.");

    await user.click(button(card, 'Confirmer le refus'));

    expect(await within(card).findByRole('alert')).toHaveTextContent(
      /impossible de joindre AcroFunJam.*Ta saisie est conservée\./,
    );
    expect(reasonField(card)).toHaveValue("Ce n'est pas une pose tenable.");
    expect(decisionStore.kept).toEqual({
      owner: bruno,
      decisions: { 'proposal-throne': { kind: 'rejection', reason: "Ce n'est pas une pose tenable." } },
    });
  });

  it('should remove the alert of a previous attempt when the validator sends another decision', async () => {
    const validation = new FakeValidationGateway(aPendingProposal());
    validation.acceptance.set(fail({ kind: 'unreachable' }));
    const { card, user } = await openQueue(validation);
    await user.click(button(card, 'Accepter et publier'));
    await within(card).findByRole('alert');
    await user.click(button(card, 'Refuser'));

    await user.click(button(card, 'Confirmer le refus'));

    expect(reasonField(card)).toHaveAttribute('aria-invalid', 'true');
    expect(within(card).queryByRole('alert')).not.toBeInTheDocument();
  });

  it('should keep what the validator keeps typing while the input is said to be kept', async () => {
    const validation = new FakeValidationGateway(aPendingProposal());
    validation.rejection.set(fail({ kind: 'unauthenticated' }));
    const decisionStore = new MemoryDecisionInputStore();
    const { card, user } = await openQueue(validation, { decisionStore });
    await user.click(button(card, 'Refuser'));
    await user.type(reasonField(card), 'Doublon');
    await user.click(button(card, 'Confirmer le refus'));
    await within(card).findByRole('alert');

    await user.type(reasonField(card), ' de Bird.');

    expect(decisionStore.kept?.decisions['proposal-throne']).toEqual({
      kind: 'rejection',
      reason: 'Doublon de Bird.',
    });
  });
});

describe('adjusting a proposal before accepting it', () => {
  const nameField = (card: HTMLElement) => within(card).getByRole('textbox', { name: 'Nom de la pose' });
  const group = (card: HTMLElement, legend: string) => within(card).getByRole('group', { name: legend });
  const radio = (card: HTMLElement, legend: string, label: string) =>
    within(group(card, legend)).getByRole('radio', { name: label });
  const openAdjustment = async (validation?: FakeValidationGateway) => {
    const view = await openQueue(validation);
    await view.user.click(button(view.card, 'Ajuster avant de publier'));
    return view;
  };

  it('should open a form prefilled with the proposed values, each reminded, in place of the pose', async () => {
    const { card } = await openAdjustment();

    expect(
      within(card).getByRole('heading', { level: 3, name: 'Ajuster avant de publier' }),
    ).toBeInTheDocument();
    expect(nameField(card)).toHaveValue('Throne');
    expect(nameField(card)).toHaveFocus();
    expect(nameField(card)).toHaveAccessibleDescription('Proposé : Throne');
    expect(radio(card, 'Difficulté base', 'Débutant')).toBeChecked();
    expect(group(card, 'Difficulté base')).toHaveAccessibleDescription('Proposée : Débutant');
    expect(radio(card, 'Difficulté flyer', 'Découverte')).toBeChecked();
    expect(radio(card, 'Peut-on terminer un flow sur cette pose ?', 'Oui')).toBeChecked();
    expect(group(card, 'Peut-on terminer un flow sur cette pose ?')).toHaveAccessibleDescription(
      'Peut terminer : le flyer redescend au sol directement et sans danger. Proposé : Oui',
    );
    expect(within(card).queryByRole('term')).not.toBeInTheDocument();
    expect(decisionButtons(card)).toHaveLength(0);
  });

  it('should tell nothing was changed, and offer to accept as proposed, when nothing differs', async () => {
    const { card, user } = await openAdjustment();
    await user.type(nameField(card), '  ');

    await user.click(button(card, 'Vérifier les ajustements'));

    const alert = within(card).getByRole('alert');
    expect(alert).toHaveTextContent("Tu n'as rien modifié. Tu peux accepter la proposition telle quelle.");
    expect(within(alert).getByRole('button', { name: 'Accepter et publier' })).toBeInTheDocument();
    expect(within(card).queryByRole('heading', { name: 'Vérifie tes ajustements' })).not.toBeInTheDocument();
  });

  it('should show what changed, proposed then retained, its title focused, before publishing', async () => {
    const { card, user } = await openAdjustment();
    await user.click(radio(card, 'Difficulté flyer', 'Débutant'));

    await user.click(button(card, 'Vérifier les ajustements'));

    expect(within(card).getByRole('heading', { level: 3, name: 'Vérifie tes ajustements' })).toHaveFocus();
    expect(
      within(card)
        .getAllByRole('term')
        .map((term) => term.textContent),
    ).toEqual(['Difficulté flyer']);
    expect(within(card).getByRole('definition')).toHaveTextContent('Proposé : Découverte, retenu : Débutant');
    expect(within(card).getByText('Les autres valeurs restent celles proposées.')).toBeInTheDocument();
    expect(
      within(card).getByRole('textbox', { name: 'Message pour le contributeur (facultatif)' }),
    ).toHaveValue('');
  });

  it('should publish with the adjustments and the message, then report it', async () => {
    const validation = new FakeValidationGateway(aPendingProposal());
    validation.acceptance.set(ok({ name: 'Throne', adjusted: true }));
    const { card, user } = await openAdjustment(validation);
    await user.click(radio(card, 'Difficulté flyer', 'Débutant'));
    await user.click(button(card, 'Vérifier les ajustements'));
    await user.type(
      within(card).getByRole('textbox', { name: 'Message pour le contributeur (facultatif)' }),
      'Plutôt débutant côté flyer.',
    );

    await user.click(button(card, 'Publier avec ces ajustements'));

    expect(
      await report('La pose « Throne » est publiée dans le catalogue avec tes ajustements.'),
    ).toBeInTheDocument();
    expect(validation.accepted).toEqual([
      {
        id: 'proposal-throne',
        acceptance: {
          adjustments: [{ field: 'flyerDifficulty', proposed: 'discovery', retained: 'beginner' }],
          note: 'Plutôt débutant côté flyer.',
        },
      },
    ]);
  });

  it('should tell the message is too long, sending nothing, the field focused', async () => {
    const validation = new FakeValidationGateway(aPendingProposal());
    const { card, user } = await openAdjustment(validation);
    await user.click(radio(card, 'Difficulté flyer', 'Débutant'));
    await user.click(button(card, 'Vérifier les ajustements'));
    const note = within(card).getByRole('textbox', { name: 'Message pour le contributeur (facultatif)' });
    await user.click(note);
    await user.paste('x'.repeat(501));

    await user.click(button(card, 'Publier avec ces ajustements'));

    expect(note).toHaveAccessibleDescription(
      'Il le verra avec tes ajustements. 500 caractères au maximum. Le message ne doit pas dépasser 500 caractères (il en compte 501).',
    );
    expect(note).toHaveAttribute('aria-invalid', 'true');
    expect(note).toHaveFocus();
    expect(validation.accepted).toEqual([]);
  });

  it('should send the adjustments again when the validator retries after an outage', async () => {
    const validation = new FakeValidationGateway(aPendingProposal());
    validation.acceptance.set(fail({ kind: 'unreachable' }), ok({ name: 'Throne', adjusted: true }));
    const { card, user } = await openAdjustment(validation);
    await user.click(radio(card, 'Difficulté flyer', 'Débutant'));
    await user.click(button(card, 'Vérifier les ajustements'));
    await user.click(button(card, 'Publier avec ces ajustements'));
    const alert = await within(card).findByRole('alert');
    expect(alert).toHaveTextContent(/impossible de joindre AcroFunJam.*Ta saisie est conservée\./);

    await user.click(within(alert).getByRole('button', { name: 'Réessayer' }));

    expect(
      await report('La pose « Throne » est publiée dans le catalogue avec tes ajustements.'),
    ).toBeInTheDocument();
    const adjusted = {
      adjustments: [{ field: 'flyerDifficulty', proposed: 'discovery', retained: 'beginner' }],
      note: null,
    };
    expect(validation.accepted).toEqual([
      { id: 'proposal-throne', acceptance: adjusted },
      { id: 'proposal-throne', acceptance: adjusted },
    ]);
  });

  it('should announce the counter of the adjusted name when the limit is passed', async () => {
    const { card, user } = await openAdjustment();
    await user.clear(nameField(card));
    await user.click(nameField(card));

    await user.paste('x'.repeat(61));

    expect(announcements()).toContain('61 / 60 caractères : 1 de trop');
  });

  it('should announce the counter of the message when it appears', async () => {
    const { card, user } = await openAdjustment();
    await user.click(radio(card, 'Difficulté flyer', 'Débutant'));
    await user.click(button(card, 'Vérifier les ajustements'));
    await user.click(within(card).getByRole('textbox', { name: 'Message pour le contributeur (facultatif)' }));

    await user.paste('x'.repeat(450));

    expect(announcements()).toContain('450 / 500 caractères');
  });

  it('should give back the form with the retained values when the validator modifies the adjustments', async () => {
    const { card, user } = await openAdjustment();
    await user.click(radio(card, 'Difficulté flyer', 'Débutant'));
    await user.click(button(card, 'Vérifier les ajustements'));

    await user.click(button(card, 'Modifier les ajustements'));

    expect(radio(card, 'Difficulté flyer', 'Débutant')).toBeChecked();
    expect(nameField(card)).toHaveFocus();
  });

  it('should tell a name is required in the form, sending nothing', async () => {
    const validation = new FakeValidationGateway(aPendingProposal());
    const { card, user } = await openAdjustment(validation);
    await user.clear(nameField(card));

    await user.click(button(card, 'Vérifier les ajustements'));

    expect(nameField(card)).toHaveAccessibleDescription('Proposé : Throne Saisis le nom de la pose.');
    expect(nameField(card)).toHaveFocus();
    expect(validation.accepted).toEqual([]);
  });

  it('should give back the form, the error on the name, when the API refuses the retained name', async () => {
    const validation = new FakeValidationGateway(aPendingProposal());
    validation.acceptance.set(fail({ kind: 'name-already-in-catalog' }));
    const { card, user } = await openAdjustment(validation);
    await user.clear(nameField(card));
    await user.type(nameField(card), 'Bird');
    await user.click(button(card, 'Vérifier les ajustements'));

    await user.click(button(card, 'Publier avec ces ajustements'));

    await waitFor(() => expect(nameField(card)).toHaveFocus());
    expect(nameField(card)).toHaveValue('Bird');
    expect(nameField(card)).toHaveAccessibleDescription(
      'Proposé : Throne Une pose de ce nom existe déjà dans le catalogue. Choisis un autre nom.',
    );
  });

  it('should go back to the pose as proposed when the validator cancels', async () => {
    const { card, user } = await openAdjustment();
    await user.click(radio(card, 'Difficulté flyer', 'Débutant'));

    await user.click(button(card, 'Annuler'));

    expect(within(card).getAllByRole('definition')[1]).toHaveTextContent('Découverte');
    await user.click(button(card, 'Ajuster avant de publier'));
    expect(radio(card, 'Difficulté flyer', 'Découverte')).toBeChecked();
  });
});

describe('input kept in the tab', () => {
  it('should give back a kept reason once, to its owner, and announce it', async () => {
    const decisionStore = new MemoryDecisionInputStore({
      owner: bruno,
      decisions: { 'proposal-throne': { kind: 'rejection', reason: "Ce n'est pas une pose tenable." } },
    });
    const { card } = await openQueue(undefined, { decisionStore });

    expect(within(card).getByRole('textbox', { name: 'Motif du refus' })).toHaveValue(
      "Ce n'est pas une pose tenable.",
    );
    await waitFor(() =>
      expect(announcements()).toContain('Ta saisie a été restaurée. Tu peux envoyer ta décision.'),
    );
    expect(decisionStore.kept).toBeNull();
  });

  it('should give back kept adjustments in the adjustment form, with the message', async () => {
    const decisionStore = new MemoryDecisionInputStore({
      owner: bruno,
      decisions: {
        'proposal-throne': {
          kind: 'acceptance',
          input: { ...aPendingProposal().pose, flyerDifficulty: 'beginner' },
          note: 'Plutôt débutant côté flyer.',
        },
      },
    });
    const { card, user } = await openQueue(undefined, { decisionStore });

    expect(
      within(within(card).getByRole('group', { name: 'Difficulté flyer' })).getByRole('radio', {
        name: 'Débutant',
      }),
    ).toBeChecked();
    await user.click(button(card, 'Vérifier les ajustements'));
    expect(
      within(card).getByRole('textbox', { name: 'Message pour le contributeur (facultatif)' }),
    ).toHaveValue('Plutôt débutant côté flyer.');
  });

  it('should announce that a kept input was for a proposal decided meanwhile', async () => {
    const decisionStore = new MemoryDecisionInputStore({
      owner: bruno,
      decisions: { 'proposal-decided': { kind: 'rejection', reason: 'Doublon.' } },
    });
    const { card } = await openQueue(undefined, { decisionStore });

    await waitFor(() =>
      expect(announcements()).toContain(
        'Une proposition sur laquelle tu avais commencé une décision a été traitée entre-temps.',
      ),
    );
    expect(announcements()).not.toContain('Ta saisie a été restaurée. Tu peux envoyer ta décision.');
    expect(decisionButtons(card)).toHaveLength(3);
  });

  it('should neither give back nor announce the input of someone else (shared device)', async () => {
    const decisionStore = new MemoryDecisionInputStore({
      owner: 'paul@example.org',
      decisions: { 'proposal-throne': { kind: 'rejection', reason: 'Doublon.' } },
    });
    const { card } = await openQueue(undefined, { decisionStore });

    expect(decisionButtons(card)).toHaveLength(3);
    expect(decisionStore.kept).toBeNull();
    expect(announcements()).not.toContain('Ta saisie a été restaurée. Tu peux envoyer ta décision.');
  });

  it('should forget the kept input when the validator signs out', async () => {
    const decisionStore = new MemoryDecisionInputStore();
    const validation = new FakeValidationGateway(aPendingProposal());
    validation.rejection.set(fail({ kind: 'unreachable' }));
    const { card, user } = await openQueue(validation, { decisionStore });
    await user.click(button(card, 'Refuser'));
    await user.type(within(card).getByRole('textbox', { name: 'Motif du refus' }), 'Doublon.');
    await user.click(button(card, 'Confirmer le refus'));
    await within(card).findByRole('alert');

    await user.click(screen.getByRole('button', { name: 'Se déconnecter' }));

    await waitFor(() => expect(decisionStore.kept).toBeNull());
  });
});
