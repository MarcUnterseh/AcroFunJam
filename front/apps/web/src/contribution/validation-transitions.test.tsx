import { fail, ok, type TransitionName } from '@acrofunjam/core';
import { QueryClient } from '@tanstack/react-query';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import {
  aPendingProposal,
  aPendingTransition,
  FakeAuthGateway,
  FakeValidationGateway,
  MemoryDecisionInputStore,
  renderSite,
} from '../test/site-harness';

// Story 7: a transition proposal in the validation queue (docs/design/composants/carte-transition.md).

const validator = () => {
  const gateway = new FakeAuthGateway();
  gateway.account = { email: 'bruno@example.org', capabilities: ['propose', 'validate-proposals'] };
  return gateway;
};

const ninjaStar = 'Transition Ninja Star de Star vers Star';

const openQueue = async (
  validation = new FakeValidationGateway(aPendingTransition()),
  name = ninjaStar,
  decisionStore = new MemoryDecisionInputStore(),
) => {
  renderSite('/propositions-a-valider', {
    gateway: validator(),
    validation,
    decisionStore,
    queryClient: new QueryClient(),
  });
  const card = await screen.findByRole('article', { name });
  return { card, user: userEvent.setup(), validation, decisionStore };
};

const button = (card: HTMLElement, name: string) => within(card).getByRole('button', { name });
const group = (card: HTMLElement, legend: string) => within(card).getByRole('group', { name: legend });
const report = (name: string) => screen.findByRole('heading', { level: 2, name });
const valueOf = (card: HTMLElement, term: string) =>
  within(card)
    .getAllByRole('term')
    .find((dt) => dt.textContent === term)?.nextElementSibling;

describe('a transition in the validation queue', () => {
  it('should be titled by its name and its poses, the names emphasised, mixed with the other proposals', async () => {
    const { card } = await openQueue(
      new FakeValidationGateway(aPendingProposal({ id: 'proposal-bird' }), aPendingTransition()),
    );

    const title = within(card).getByRole('heading', { level: 2 });
    expect(title).toHaveTextContent(ninjaStar);
    expect([...title.querySelectorAll('strong')].map((strong) => strong.textContent)).toEqual([
      'Ninja Star',
      'Star',
      'Star',
    ]);
    const names = within(screen.getByRole('list'))
      .getAllByRole('article')
      .map((article) => within(article).getByRole('heading', { level: 2 }).textContent);
    expect(names).toEqual(['Throne', ninjaStar]);
  });

  it('should present its contributor, its difficulties and its description', async () => {
    const { card } = await openQueue();

    expect(within(card).getByText(/^Proposée par/)).toHaveTextContent(
      'Proposée par alice@example.org le 14 novembre 2026',
    );
    expect(valueOf(card, 'Base')).toHaveTextContent('Avancé');
    expect(valueOf(card, 'Flyer')).toHaveTextContent('Avancé');
    expect(within(card).getByText('Description')).toBeInTheDocument();
    expect(within(card).getByText('Vidéo : https://example.org/ninja-star')).toBeInTheDocument();
  });

  it('should title a transition without a name by its poses, without a description block when it has none', async () => {
    const unnamed = aPendingTransition({
      fromPose: { id: 'pose-throne', name: 'Throne' },
      toPose: { id: 'pose-bird', name: 'Bird' },
      transition: { name: null, baseDifficulty: 'beginner', flyerDifficulty: 'beginner', description: null },
    });
    const { card } = await openQueue(new FakeValidationGateway(unnamed), 'Transition de Throne vers Bird');

    expect(within(card).queryByText('Description')).not.toBeInTheDocument();
  });

  it('should accept it as proposed, then report it published in the catalog', async () => {
    const { card, user, validation } = await openQueue();

    await user.click(button(card, 'Accepter et publier'));

    const title = await report(
      'La transition « Ninja Star » de Star vers Star est publiée dans le catalogue.',
    );
    await waitFor(() => expect(title).toHaveFocus());
    expect(validation.acceptedTransitions).toEqual([
      {
        id: 'transition-ninja-star',
        kind: 'transition-proposal',
        acceptance: { adjustments: [], note: null },
      },
    ]);
  });

  it('should tell a transition of this name was published meanwhile between these poses', async () => {
    const validation = new FakeValidationGateway(aPendingTransition());
    validation.transitionAcceptance.set(fail({ kind: 'transition-name-already-in-catalog' }));
    const { card, user } = await openQueue(validation);

    await user.click(button(card, 'Accepter et publier'));

    expect(await within(card).findByRole('alert')).toHaveTextContent(
      'Une transition de ce nom relie déjà ces poses dans le catalogue.',
    );
  });

  it('should reject it with a reason, at the address of a transition', async () => {
    const { card, user, validation } = await openQueue();

    await user.click(button(card, 'Refuser'));
    await user.type(within(card).getByRole('textbox', { name: 'Motif du refus' }), 'Doublon.');
    await user.click(button(card, 'Confirmer le refus'));

    expect(
      await report('La proposition de la transition « Ninja Star » de Star vers Star est refusée.'),
    ).toBeInTheDocument();
    expect(validation.rejected).toEqual([
      { id: 'transition-ninja-star', kind: 'transition-proposal', reason: 'Doublon.' },
    ]);
  });

  it('should adjust it: the fields of a transition without its poses, each reminding the proposed value', async () => {
    const { card, user } = await openQueue();

    await user.click(button(card, 'Ajuster avant de publier'));

    const name = within(card).getByRole('textbox', { name: 'Nom de la transition (facultatif)' });
    expect(name).toHaveValue('Ninja Star');
    expect(name).toHaveFocus();
    expect(name).toHaveAccessibleDescription(expect.stringContaining('Proposé : Ninja Star'));
    expect(group(card, 'Difficulté flyer')).toHaveAccessibleDescription(
      expect.stringContaining('Proposée : Avancé'),
    );
    expect(within(card).getByRole('textbox', { name: 'Description (facultative)' })).toHaveValue(
      'Vidéo : https://example.org/ninja-star',
    );
    expect(within(card).queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('should publish the transition with the adjustments checked in the summary, and the note', async () => {
    const validation = new FakeValidationGateway(
      aPendingTransition({
        transition: { ...aPendingTransition().transition, name: 'ninja star' as TransitionName },
      }),
    );
    validation.transitionAcceptance.set(
      ok({
        name: 'Ninja Star',
        fromPose: { id: 'pose-star', name: 'Star' },
        toPose: { id: 'pose-star', name: 'Star' },
        adjusted: true,
      }),
    );
    const { card, user } = await openQueue(validation, 'Transition ninja star de Star vers Star');

    await user.click(button(card, 'Ajuster avant de publier'));
    const name = within(card).getByRole('textbox', { name: 'Nom de la transition (facultatif)' });
    await user.clear(name);
    await user.type(name, 'Ninja Star');
    await user.click(button(card, 'Vérifier les ajustements'));

    expect(
      await within(card).findByRole('heading', { level: 3, name: 'Vérifie tes ajustements' }),
    ).toHaveFocus();
    expect(valueOf(card, 'Nom de la transition')).toHaveTextContent(
      'Proposé : ninja star, retenu : Ninja Star',
    );
    await user.type(
      within(card).getByRole('textbox', { name: /^Message pour le contributeur/ }),
      'Nom usuel.',
    );
    await user.click(button(card, 'Publier avec ces ajustements'));

    expect(
      await report(
        'La transition « Ninja Star » de Star vers Star est publiée dans le catalogue avec tes ajustements.',
      ),
    ).toBeInTheDocument();
    expect(validation.acceptedTransitions[0]?.acceptance).toEqual({
      adjustments: [{ field: 'name', proposed: 'ninja star', retained: 'Ninja Star' }],
      note: 'Nom usuel.',
    });
  });

  it('should tell, in the adjustment zone, that nothing was adjusted', async () => {
    const { card, user, validation } = await openQueue();

    await user.click(button(card, 'Ajuster avant de publier'));
    await user.click(button(card, 'Vérifier les ajustements'));

    expect(
      await within(card).findByText("Tu n'as rien modifié. Tu peux accepter la proposition telle quelle."),
    ).toBeInTheDocument();
    expect(validation.acceptedTransitions).toEqual([]);
  });

  it('should keep the adjustments typed after an outage', async () => {
    const validation = new FakeValidationGateway(aPendingTransition());
    validation.transitionAcceptance.set(fail({ kind: 'unreachable' }));
    const { card, user, decisionStore } = await openQueue(validation);

    await user.click(button(card, 'Ajuster avant de publier'));
    await user.click(within(group(card, 'Difficulté flyer')).getByRole('radio', { name: 'Intermédiaire' }));
    await user.click(button(card, 'Vérifier les ajustements'));
    await user.click(await within(card).findByRole('button', { name: 'Publier avec ces ajustements' }));

    expect(await within(card).findByRole('alert')).toHaveTextContent('impossible de joindre AcroFunJam');
    expect(decisionStore.kept?.decisions['transition-ninja-star']).toMatchObject({
      kind: 'transition-acceptance',
      input: { flyerDifficulty: 'intermediate' },
    });
  });
});
