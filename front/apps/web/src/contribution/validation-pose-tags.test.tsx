import { type PoseName } from '@acrofunjam/core';
import { QueryClient } from '@tanstack/react-query';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import {
  aPendingProposal,
  aPendingRevision,
  FakeAuthGateway,
  FakeValidationGateway,
  renderSite,
  seededTags,
} from '../test/site-harness';

// Story 9a « Étiqueter les poses »: the tags of a proposed or revised pose in the validation queue
// (docs/design/ecrans/9a-etiquettes-des-poses.md § 6).

const validator = () => {
  const gateway = new FakeAuthGateway();
  gateway.account = { email: 'bruno@example.org', capabilities: ['propose', 'validate-proposals'] };
  return gateway;
};

const lunaire = { id: seededTags.find((tag) => tag.name === 'lunaire')!.id, name: 'lunaire' };
const inversion = { id: seededTags.find((tag) => tag.name === 'inversion')!.id, name: 'inversion' };

const openQueue = async (validation: FakeValidationGateway, name: string) => {
  renderSite('/propositions-a-valider', { gateway: validator(), validation, queryClient: new QueryClient() });
  const card = await screen.findByRole('article', { name });
  return { card, user: userEvent.setup() };
};

const pillsOf = (card: HTMLElement) =>
  within(within(card).getByRole('list', { name: 'Étiquettes' }))
    .getAllByRole('listitem')
    .map((pill) => pill.textContent);

describe('the tags of a proposed pose in the validation queue', () => {
  it('should present the proposed tags of the pose', async () => {
    const proposal = aPendingProposal();
    const { card } = await openQueue(
      new FakeValidationGateway({ ...proposal, pose: { ...proposal.pose, tags: [inversion, lunaire] } }),
      'Throne',
    );

    expect(pillsOf(card)).toEqual(['inversion', 'lunaire']);
  });

  it('should say « aucune » for a pose proposed without tags', async () => {
    const { card } = await openQueue(new FakeValidationGateway(aPendingProposal()), 'Throne');

    expect(within(card).getByText('Étiquettes').closest('.tag-line')).toHaveTextContent('aucune');
  });

  it('should let the validator adjust the tags, reminding the proposed ones, and sum up the adjustment', async () => {
    const proposal = aPendingProposal();
    const validation = new FakeValidationGateway({ ...proposal, pose: { ...proposal.pose, tags: [] } });
    const { card, user } = await openQueue(validation, 'Throne');

    await user.click(within(card).getByRole('button', { name: 'Ajuster avant de publier' }));
    const group = within(card).getByRole('group', { name: 'Étiquettes' });
    expect(group).toHaveAccessibleDescription(/Proposées : aucune/);
    await user.click(within(group).getByRole('checkbox', { name: 'inversion' }));
    await user.click(within(card).getByRole('button', { name: 'Vérifier les ajustements' }));

    expect(within(card).getByText('Étiquettes', { selector: 'dt' }).closest('div')).toHaveTextContent(
      /aucune.*inversion/,
    );
    await user.click(within(card).getByRole('button', { name: /^Publier/ }));
    expect(validation.accepted[0]?.acceptance.adjustments).toEqual([
      { field: 'tags', proposed: [], retained: [inversion] },
    ]);
  });
});

describe('the tags of a revision in the validation queue', () => {
  it('should present the change of tags of a revision', async () => {
    const revision = aPendingRevision({
      changes: [{ field: 'tags', before: [], after: [lunaire] }],
    });
    const { card } = await openQueue(
      new FakeValidationGateway({ ...revision, pose: { ...revision.pose, name: 'Folded Leaf' as PoseName } }),
      'Modification de Folded Leaf',
    );

    expect(
      within(card)
        .getAllByText(/Étiquettes/)[0]!
        .closest('div'),
    ).toHaveTextContent(/aucune.*lunaire/);
  });
});
