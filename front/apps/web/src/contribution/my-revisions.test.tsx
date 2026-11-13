import { ok, type MyProposal, type PoseName, type RejectionReason } from '@acrofunjam/core';
import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  aMyProposal,
  aMyRevision,
  FakeAuthGateway,
  FakeContributionGateway,
  renderSite,
} from '../test/site-harness';

// Story 6: a revision of the requester in « Mes propositions » (docs/design/composants/carte-ma-modification.md).

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
const decidedAt = new Date('2026-11-13T10:00:00Z');

describe('a revision in « Mes propositions »', () => {
  it('should be mixed with the pose proposals, titled « Modification de » the name when proposed', async () => {
    openMyProposals(aMyRevision({ poseName: 'Thron' as PoseName }), aMyProposal());

    expect(await card('Modification de Thron')).toBeInTheDocument();
    expect(
      screen.getByText(
        "Les poses, les modifications et les transitions que tu proposes apparaissent ici, avec ce qu'elles deviennent.",
      ),
    ).toBeInTheDocument();
  });

  it('should present a pending revision, what it means for the pose, and what changes, before → proposed', async () => {
    openMyProposals(aMyRevision());

    const revision = await card('Modification de Throne');
    expect(within(revision).getByText('Proposée le', { exact: false })).toHaveTextContent(
      'Proposée le 12 novembre 2026',
    );
    expect(
      within(revision)
        .getByText(/^Statut :/)
        .closest('p'),
    ).toHaveTextContent('Statut : En attente de validation');
    expect(
      within(revision).getByText('La pose changera dans le catalogue une fois la modification acceptée.'),
    ).toBeInTheDocument();
    expect(
      within(revision).getByRole('heading', { level: 3, name: 'Ce qui change dans la pose' }),
    ).toBeInTheDocument();
    expect(valueOf(revision, 'Difficulté flyer')).toEqual(['Avant : Intermédiaire, proposé : Découverte']);
    // Only what changes: not the pose as a whole.
    expect(valueOf(revision, 'Base')).toEqual([]);
  });

  it('should present a revision accepted with adjustments: before → retained, then the adjustments and the message', async () => {
    openMyProposals(
      aMyRevision({
        status: {
          kind: 'accepted-with-adjustments',
          decidedAt,
          adjustments: [{ field: 'baseDifficulty', proposed: 'beginner', retained: 'discovery' }],
          message: null,
        },
        changes: [
          { field: 'baseDifficulty', before: 'beginner', after: 'discovery' },
          { field: 'flyerDifficulty', before: 'advanced', after: 'intermediate' },
        ],
      }),
    );

    const revision = await card('Modification de Throne');
    expect(
      within(revision).getByText('La pose est modifiée dans le catalogue avec ces ajustements.'),
    ).toBeInTheDocument();
    expect(valueOf(revision, 'Difficulté base')).toEqual([
      'Avant : Débutant, retenu : Découverte',
      'Proposé : Débutant, retenu : Découverte',
    ]);
    expect(valueOf(revision, 'Difficulté flyer')).toEqual(['Avant : Avancé, retenu : Intermédiaire']);
    expect(
      within(revision).getByRole('heading', { level: 3, name: 'Ajustements apportés' }),
    ).toBeInTheDocument();
  });

  it('should present a rejected revision: the pose stays as it is, and the reason', async () => {
    openMyProposals(
      aMyRevision({
        status: { kind: 'rejected', decidedAt, reason: 'Throne reste intermédiaire.' as RejectionReason },
      }),
    );

    const revision = await card('Modification de Throne');
    expect(within(revision).getByText('La pose reste inchangée dans le catalogue.')).toBeInTheDocument();
    expect(within(revision).getByText('Motif du refus')).toBeInTheDocument();
    expect(within(revision).getByText('Throne reste intermédiaire.')).toBeInTheDocument();
  });
});
