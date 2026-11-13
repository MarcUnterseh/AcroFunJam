import { fail, ok, type RevisionMessage } from '@acrofunjam/core';
import { QueryClient } from '@tanstack/react-query';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import {
  aPendingProposal,
  aPendingRevision,
  FakeAuthGateway,
  FakeValidationGateway,
  renderSite,
} from '../test/site-harness';

// Story 6: a revision proposal in the validation queue (docs/design/composants/carte-modification.md).

const validator = () => {
  const gateway = new FakeAuthGateway();
  gateway.account = { email: 'bruno@example.org', capabilities: ['propose', 'validate-proposals'] };
  return gateway;
};

const openQueue = async (validation = new FakeValidationGateway(aPendingRevision())) => {
  renderSite('/propositions-a-valider', { gateway: validator(), validation, queryClient: new QueryClient() });
  const card = await screen.findByRole('article', { name: 'Modification de Throne' });
  return { card, user: userEvent.setup(), validation };
};

const button = (card: HTMLElement, name: string) => within(card).getByRole('button', { name });
const group = (card: HTMLElement, legend: string) => within(card).getByRole('group', { name: legend });
const radio = (card: HTMLElement, legend: string, option: string) =>
  within(group(card, legend)).getByRole('radio', { name: option });
const report = (name: string) => screen.findByRole('heading', { level: 2, name });
const valueOf = (card: HTMLElement, term: string) =>
  within(card)
    .getAllByRole('term')
    .find((dt) => dt.textContent === term)?.nextElementSibling;

describe('a revision in the validation queue', () => {
  it('should be mixed with the pose proposals, in the order received', async () => {
    await openQueue(new FakeValidationGateway(aPendingProposal({ id: 'proposal-star' }), aPendingRevision()));

    const names = within(screen.getByRole('list'))
      .getAllByRole('article')
      .map((card) => within(card).getByRole('heading', { level: 2 }).textContent);
    expect(names).toEqual(['Throne', 'Modification de Throne']);
    expect(
      screen.getByText(
        "Vérifie chaque proposition de pose, de modification ou de transition : accepte-la, ajuste-la avant de l'accepter ou refuse-la.",
      ),
    ).toBeInTheDocument();
  });

  it('should present its contributor, the changed fields only, current then proposed, and its message', async () => {
    const { card } = await openQueue(
      new FakeValidationGateway(
        aPendingRevision({ message: 'Throne se découvre dès la première séance.' as RevisionMessage }),
      ),
    );

    expect(within(card).getByText(/^Proposée par/)).toHaveTextContent(
      'Proposée par alice@example.org le 12 novembre 2026',
    );
    expect(
      within(card).getByRole('heading', { level: 3, name: 'Ce qui change dans la pose' }),
    ).toBeInTheDocument();
    expect(valueOf(card, 'Difficulté flyer')).toHaveTextContent(
      'Actuellement : Intermédiaire, proposé : Découverte',
    );
    expect(valueOf(card, 'Difficulté base')).toBeUndefined();
    expect(within(card).getByText('Message de modification')).toBeInTheDocument();
    expect(within(card).getByText('Throne se découvre dès la première séance.')).toBeInTheDocument();
  });

  it('should present the pose as it will be once the revision is accepted', async () => {
    const { card } = await openQueue();

    expect(
      within(card).getByRole('heading', { level: 3, name: 'La pose après modification' }),
    ).toBeInTheDocument();
    expect(valueOf(card, 'Base')).toHaveTextContent('Débutant');
    expect(valueOf(card, 'Flyer')).toHaveTextContent('Découverte');
  });

  it('should offer to accept the revision, adjust it before accepting, or reject it', async () => {
    const { card } = await openQueue();

    expect(
      within(card)
        .getAllByRole('button')
        .map((b) => b.textContent),
    ).toEqual(['Accepter la modification', "Ajuster avant d'accepter", 'Refuser']);
  });
});

describe('deciding on a revision', () => {
  it('should accept the revision as proposed, then say the pose is modified in the catalog', async () => {
    const { card, user, validation } = await openQueue();

    await user.click(button(card, 'Accepter la modification'));

    expect(validation.accepted).toEqual([
      { id: 'revision-throne', kind: 'pose-revision', acceptance: { adjustments: [], note: null } },
    ]);
    const title = await report('La pose « Throne » est modifiée dans le catalogue.');
    await waitFor(() => expect(title).toHaveFocus());
  });

  it('should reject the revision with its reason, then say the modification is rejected', async () => {
    const { card, user, validation } = await openQueue();

    await user.click(button(card, 'Refuser'));
    await user.type(
      within(card).getByRole('textbox', { name: 'Motif du refus' }),
      'Throne reste intermédiaire.',
    );
    await user.click(button(card, 'Confirmer le refus'));

    expect(validation.rejected).toEqual([
      { id: 'revision-throne', kind: 'pose-revision', reason: 'Throne reste intermédiaire.' },
    ]);
    expect(await report('La modification de « Throne » est refusée.')).toBeInTheDocument();
  });

  it('should prefill the adjustment form with the revised pose, reminding the current and the proposed values', async () => {
    const { card, user } = await openQueue();

    await user.click(button(card, "Ajuster avant d'accepter"));

    expect(
      within(card).getByRole('heading', { level: 3, name: "Ajuster avant d'accepter" }),
    ).toBeInTheDocument();
    // What the revision changes stays in view while adjusting.
    expect(valueOf(card, 'Difficulté flyer')).toHaveTextContent(
      'Actuellement : Intermédiaire, proposé : Découverte',
    );
    expect(radio(card, 'Difficulté flyer', 'Découverte')).toBeChecked();
    expect(group(card, 'Difficulté flyer')).toHaveAccessibleDescription(
      'Actuellement : Intermédiaire Proposée : Découverte',
    );
    expect(group(card, 'Difficulté base')).toHaveAccessibleDescription('Actuellement : Débutant');
    expect(within(card).getByRole('textbox', { name: 'Nom de la pose' })).toHaveAccessibleDescription(
      'Actuellement : Throne',
    );
  });

  it('should tell nothing was adjusted, and offer to accept the revision as such', async () => {
    const { card, user } = await openQueue();
    await user.click(button(card, "Ajuster avant d'accepter"));

    await user.click(button(card, 'Vérifier les ajustements'));

    const alert = within(card).getByRole('alert');
    expect(alert).toHaveTextContent("Tu n'as rien modifié. Tu peux accepter la modification telle quelle.");
    expect(within(alert).getByRole('button', { name: 'Accepter la modification' })).toBeInTheDocument();
  });

  it('should tell, as soon as the adjustments are checked, that the retained values would leave the pose as it is', async () => {
    const { card, user, validation } = await openQueue();
    await user.click(button(card, "Ajuster avant d'accepter"));
    await user.click(radio(card, 'Difficulté flyer', 'Intermédiaire'));

    await user.click(button(card, 'Vérifier les ajustements'));

    expect(within(card).getByRole('alert')).toHaveTextContent(
      'Avec ces ajustements, la pose ne changerait pas. Modifie tes ajustements, ou refuse la modification.',
    );
    expect(within(card).queryByRole('heading', { name: 'Vérifie tes ajustements' })).not.toBeInTheDocument();
    expect(validation.accepted).toEqual([]);
  });

  it('should drop the alert of a retained revision that changes nothing once a field changes', async () => {
    const { card, user } = await openQueue();
    await user.click(button(card, "Ajuster avant d'accepter"));
    await user.click(radio(card, 'Difficulté flyer', 'Intermédiaire'));
    await user.click(button(card, 'Vérifier les ajustements'));

    await user.click(radio(card, 'Difficulté flyer', 'Débutant'));

    expect(within(card).queryByRole('alert')).not.toBeInTheDocument();
  });

  it('should accept with the adjustments, then say the pose is modified with them', async () => {
    const validation = new FakeValidationGateway(aPendingRevision());
    validation.acceptance.set(ok({ name: 'Throne', adjusted: true }));
    const { card, user } = await openQueue(validation);
    await user.click(button(card, "Ajuster avant d'accepter"));
    await user.click(radio(card, 'Difficulté base', 'Découverte'));
    await user.click(button(card, 'Vérifier les ajustements'));

    expect(valueOf(card, 'Difficulté base')).toHaveTextContent('Proposé : Débutant, retenu : Découverte');
    await user.click(button(card, 'Accepter avec ces ajustements'));

    expect(validation.accepted[0]?.acceptance.adjustments).toEqual([
      { field: 'baseDifficulty', proposed: 'beginner', retained: 'discovery' },
    ]);
    expect(
      await report('La pose « Throne » est modifiée dans le catalogue avec tes ajustements.'),
    ).toBeInTheDocument();
  });

  it('should tell the pose changed meanwhile when the API says so', async () => {
    const validation = new FakeValidationGateway(aPendingRevision());
    validation.acceptance.set(fail({ kind: 'pose-changed' }));
    const { card, user } = await openQueue(validation);

    await user.click(button(card, 'Accepter la modification'));

    const alert = await within(card).findByRole('alert');
    expect(alert).toHaveTextContent('Cette pose a changé depuis que la modification a été proposée.');
    expect(within(alert).getByRole('button', { name: 'Recharger la page' })).toBeInTheDocument();
  });
});
