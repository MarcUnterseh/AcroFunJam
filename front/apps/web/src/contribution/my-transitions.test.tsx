import {
  ok,
  type MyProposal,
  type RejectionReason,
  type TransitionDescription,
  type TransitionName,
} from '@acrofunjam/core';
import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  aMyProposal,
  aMyTransition,
  FakeAuthGateway,
  FakeContributionGateway,
  renderSite,
} from '../test/site-harness';

// Story 7: a transition of the requester in « Mes propositions » (docs/design/composants/carte-transition.md).

const openMyProposals = (...proposals: MyProposal[]) => {
  const gateway = new FakeAuthGateway();
  gateway.account = { email: 'alice@example.org' };
  const contribution = new FakeContributionGateway();
  contribution.myProposals.set(ok(proposals));
  return renderSite('/mes-propositions', { gateway, contribution });
};

const card = (name: string) => screen.findByRole('article', { name });
const valueOf = (container: HTMLElement, term: string) =>
  within(container)
    .getAllByRole('term')
    .filter((dt) => dt.textContent === term)
    .map((dt) => dt.nextElementSibling?.textContent);
const decidedAt = new Date('2026-11-15T10:00:00Z');

describe('a transition in « Mes propositions »', () => {
  it('should be mixed with the other proposals, titled by its name and its poses', async () => {
    openMyProposals(aMyTransition(), aMyProposal());

    const transition = await card('Transition Ninja Star de Star vers Star');
    const names = [...within(transition).getByRole('heading', { level: 2 }).querySelectorAll('strong')];
    expect(names.map((name) => name.textContent)).toEqual(['Ninja Star', 'Star', 'Star']);
    expect(await card('Throne')).toBeInTheDocument();
  });

  it('should present a pending transition, what it means, its difficulties and its description', async () => {
    openMyProposals(aMyTransition());

    const transition = await card('Transition Ninja Star de Star vers Star');
    expect(within(transition).getByText('Proposée le', { exact: false })).toHaveTextContent(
      'Proposée le 14 novembre 2026',
    );
    expect(
      within(transition)
        .getByText(/^Statut :/)
        .closest('p'),
    ).toHaveTextContent('Statut : En attente de validation');
    expect(
      within(transition).getByText('La transition apparaîtra dans le catalogue une fois acceptée.'),
    ).toBeInTheDocument();
    expect(valueOf(transition, 'Base')).toEqual(['Avancé']);
    expect(valueOf(transition, 'Flyer')).toEqual(['Avancé']);
    expect(within(transition).getByText('Vidéo : https://example.org/ninja-star')).toBeInTheDocument();
  });

  it('should title a transition without a name by its poses', async () => {
    openMyProposals(
      aMyTransition({
        fromPose: { id: 'pose-throne', name: 'Throne' },
        toPose: { id: 'pose-bird', name: 'Bird' },
        transition: {
          name: null,
          baseDifficulty: 'beginner',
          flyerDifficulty: 'beginner',
          description: null,
        },
      }),
    );

    expect(await card('Transition de Throne vers Bird')).toBeInTheDocument();
  });

  it('should present the adjustments of a transition accepted with adjustments, proposed → retained', async () => {
    openMyProposals(
      aMyTransition({
        transition: {
          ...aMyTransition().transition,
          description: 'Rotation complète, retour en Star.' as TransitionDescription,
        },
        status: {
          kind: 'accepted-with-adjustments',
          decidedAt,
          adjustments: [
            { field: 'name', proposed: null, retained: 'Ninja Star' as TransitionName },
            {
              field: 'description',
              proposed: 'Vidéo : https://example.org/ninja-star' as TransitionDescription,
              retained: 'Rotation complète, retour en Star.' as TransitionDescription,
            },
          ],
          message: null,
        },
      }),
    );

    const transition = await card('Transition Ninja Star de Star vers Star');
    expect(
      within(transition).getByRole('heading', { level: 3, name: 'Ajustements apportés' }),
    ).toBeInTheDocument();
    expect(valueOf(transition, 'Nom de la transition')).toEqual(['Proposé : aucun nom, retenu : Ninja Star']);
    expect(valueOf(transition, 'Description')).toEqual([
      'Proposé : Vidéo : https://example.org/ninja-star, retenu : Rotation complète, retour en Star.',
    ]);
    expect(
      within(transition).getByText('Elle est publiée dans le catalogue avec ces ajustements.'),
    ).toBeInTheDocument();
  });

  it('should present the reason of a rejected transition', async () => {
    openMyProposals(
      aMyTransition({
        status: { kind: 'rejected', decidedAt, reason: 'Elle arrive en Bird.' as RejectionReason },
      }),
    );

    const transition = await card('Transition Ninja Star de Star vers Star');
    expect(within(transition).getByText('Motif du refus')).toBeInTheDocument();
    expect(within(transition).getByText('Elle arrive en Bird.')).toBeInTheDocument();
    expect(within(transition).getByText("Elle n'est pas publiée dans le catalogue.")).toBeInTheDocument();
  });
});
