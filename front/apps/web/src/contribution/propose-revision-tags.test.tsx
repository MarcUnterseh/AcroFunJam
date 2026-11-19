import { ok } from '@acrofunjam/core';
import { QueryClient } from '@tanstack/react-query';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import {
  aRevisablePose,
  FakeAuthGateway,
  FakePoseRevisionGateway,
  renderSite,
  seededTags,
} from '../test/site-harness';

// Story 9a « Étiqueter les poses »: the tags of a pose in the form « Proposer une modification »
// (docs/design/ecrans/9a-etiquettes-des-poses.md § 5, Q172).

const signedIn = () => {
  const gateway = new FakeAuthGateway();
  gateway.account = { email: 'alice@example.org', capabilities: ['propose'] };
  return gateway;
};

const lunaire = { id: seededTags.find((tag) => tag.name === 'lunaire')!.id, name: 'lunaire' };
const inversion = { id: seededTags.find((tag) => tag.name === 'inversion')!.id, name: 'inversion' };

const open = async (tags = [lunaire]) => {
  const revision = new FakePoseRevisionGateway();
  revision.pose.set(ok(aRevisablePose({ tags })));
  renderSite('/poses/pose-throne/proposer-une-modification', {
    gateway: signedIn(),
    revision,
    queryClient: new QueryClient(),
  });
  await screen.findByRole('form', { name: 'Proposer une modification' });
  return { revision, user: userEvent.setup() };
};

describe('the tags in the form of a revision', () => {
  it('should present the current tags of the pose checked, and remind them', async () => {
    await open();

    const group = await screen.findByRole('group', { name: 'Étiquettes' });
    expect(within(group).getByRole('checkbox', { name: 'lunaire' })).toBeChecked();
    expect(within(group).getByRole('checkbox', { name: 'inversion' })).not.toBeChecked();
    expect(group).toHaveAccessibleDescription(/Actuellement : lunaire/);
  });

  it('should mark the tags as modified once another set is chosen, and send only them', async () => {
    const { revision, user } = await open();

    await user.click(await screen.findByRole('checkbox', { name: 'inversion' }));

    expect(screen.getByRole('group', { name: /^Étiquettes/ })).toHaveTextContent('Modifiée');
    await user.click(screen.getByRole('button', { name: 'Proposer la modification' }));
    expect(revision.sent[0]?.changes).toEqual([
      { field: 'tags', before: [lunaire], after: [inversion, lunaire] },
    ]);
  });

  it('should remind that the pose has no tag when it has none', async () => {
    await open([]);

    expect(await screen.findByRole('group', { name: 'Étiquettes' })).toHaveAccessibleDescription(
      /Actuellement : aucune/,
    );
  });
});
