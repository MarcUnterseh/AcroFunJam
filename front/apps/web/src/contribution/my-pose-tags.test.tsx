import { ok, type AdjustmentNote } from '@acrofunjam/core';
import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { aMyProposal, FakeAuthGateway, FakeContributionGateway, renderSite } from '../test/site-harness';

// Story 9a « Étiqueter les poses »: the tags of their poses in « Mes propositions » (9a-etiquettes-des-poses.md § 6).

const lunaire = { id: 'tag-lunaire', name: 'lunaire' };
const inversion = { id: 'tag-inversion', name: 'inversion' };

const open = async (proposal = aMyProposal()) => {
  const gateway = new FakeAuthGateway();
  gateway.account = { email: 'alice@example.org' };
  const contribution = new FakeContributionGateway();
  contribution.myProposals.set(ok([proposal]));
  renderSite('/mes-propositions', { gateway, contribution });
  return screen.findByRole('article', { name: proposal.pose.name });
};

describe('the tags of a proposed pose in « Mes propositions »', () => {
  it('should present the tags of the pose', async () => {
    const card = await open(aMyProposal({ pose: { ...aMyProposal().pose, tags: [lunaire] } }));

    const line = within(card).getByRole('list', { name: 'Étiquettes' });
    expect(
      within(line)
        .getAllByRole('listitem')
        .map((pill) => pill.textContent),
    ).toEqual(['lunaire']);
  });

  it('should present the adjustment of the tags of a pose accepted with other tags', async () => {
    const card = await open(
      aMyProposal({
        pose: { ...aMyProposal().pose, tags: [lunaire] },
        status: {
          kind: 'accepted-with-adjustments',
          decidedAt: new Date('2026-11-19T10:00:00Z'),
          adjustments: [{ field: 'tags', proposed: [inversion, lunaire], retained: [lunaire] }],
          message: null as AdjustmentNote | null,
        },
      }),
    );

    const lines = within(card)
      .getAllByText('Étiquettes', { selector: 'dt' })
      .map((term) => term.closest('div')?.textContent ?? '');
    expect(lines.some((line) => /inversion, lunaire.*lunaire/.test(line))).toBe(true);
  });
});
