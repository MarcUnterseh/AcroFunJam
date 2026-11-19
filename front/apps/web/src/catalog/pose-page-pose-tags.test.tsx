import { fail, ok, type PosePage } from '@acrofunjam/core';
import { QueryClient } from '@tanstack/react-query';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import {
  FakeAuthGateway,
  FakePosePageGateway,
  FakePoseTaggingGateway,
  FakeTagListGateway,
  renderSite,
  seededTags,
} from '../test/site-harness';

// Story 9a « Étiqueter les poses »: the tags of a pose on its page, and their direct tagging by the validators
// (docs/design/ecrans/9a-etiquettes-des-poses.md § 1, zone-etiqueter.md « Variante pose », ADR 0036).

const tagOf = (name: string) => {
  const { id, description } = seededTags.find((tag) => tag.name === name)!;
  return { id, name, description };
};

const foldedLeaf = (overrides: Partial<PosePage> = {}): PosePage => ({
  id: 'pose-leaf',
  name: 'Folded Leaf',
  baseDifficulty: 'beginner',
  flyerDifficulty: 'discovery',
  canStartFlow: true,
  canEndFlow: true,
  transitionsFrom: [],
  transitionsTo: [],
  tags: [tagOf('lunaire')],
  pendingRevision: false,
  ...overrides,
});

const validator = () => {
  const gateway = new FakeAuthGateway();
  gateway.account = {
    email: 'bruno@example.org',
    capabilities: ['propose', 'validate-proposals', 'manage-tags'],
  };
  return gateway;
};

const open = ({
  page = new FakePosePageGateway(ok(foldedLeaf())),
  gateway = new FakeAuthGateway(),
  poseTagging = new FakePoseTaggingGateway(),
} = {}) => {
  renderSite('/poses/pose-leaf', {
    posePage: page,
    gateway,
    poseTagging,
    tags: new FakeTagListGateway(ok(seededTags)),
    queryClient: new QueryClient({ defaultOptions: { queries: { retry: false } } }),
  });
  return { page, poseTagging, user: userEvent.setup() };
};

describe('the tags of a pose on its page', () => {
  it('should present the tags of the pose under its characteristics, and their meaning in a fold', async () => {
    open();

    const line = await screen.findByRole('list', { name: 'Étiquettes' });
    expect(
      within(line)
        .getAllByRole('listitem')
        .map((pill) => pill.textContent),
    ).toEqual(['lunaire']);
    const fold = screen.getByText('Ce que veulent dire les étiquettes de la pose').closest('details')!;
    expect(within(fold).getByText(tagOf('lunaire').description)).toBeInTheDocument();
  });

  it('should present neither line nor fold, nor button, to a visitor for a pose without tags', async () => {
    open({ page: new FakePosePageGateway(ok(foldedLeaf({ tags: [] }))) });

    await screen.findByRole('heading', { level: 1, name: 'Folded Leaf' });
    expect(screen.queryByRole('list', { name: 'Étiquettes' })).not.toBeInTheDocument();
    expect(screen.queryByText('Ce que veulent dire les étiquettes de la pose')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Étiqueter la pose/ })).not.toBeInTheDocument();
  });

  it('should let a validator tag the pose among the tags that apply to poses, its tags checked', async () => {
    const page = new FakePosePageGateway(
      ok(foldedLeaf()),
      ok(foldedLeaf({ tags: [tagOf('inversion'), tagOf('lunaire')] })),
    );
    const { poseTagging, user } = open({ page, gateway: validator() });

    await user.click(await screen.findByRole('button', { name: 'Étiqueter la pose Folded Leaf' }));
    const group = await screen.findByRole('group', { name: 'Étiquettes de la pose' });
    expect(
      within(group)
        .getAllByRole('checkbox')
        .map((box) => box.closest('label')?.textContent),
    ).toEqual(['inversion', 'lunaire']);
    expect(within(group).getByRole('checkbox', { name: 'lunaire' })).toBeChecked();
    await user.click(within(group).getByRole('checkbox', { name: 'inversion' }));
    await user.click(screen.getByRole('button', { name: 'Enregistrer les étiquettes' }));

    expect(poseTagging.sent).toEqual([
      { poseId: 'pose-leaf', tagIds: [tagOf('inversion').id, tagOf('lunaire').id] },
    ]);
    expect(await screen.findByText('Étiquettes de la pose enregistrées.')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByRole('group', { name: 'Étiquettes de la pose' })).not.toBeInTheDocument(),
    );
  });

  it('should ask a validator to decide first on the pending revision, without any tag to check', async () => {
    const { user } = open({
      page: new FakePosePageGateway(ok(foldedLeaf({ pendingRevision: true }))),
      gateway: validator(),
    });

    await user.click(await screen.findByRole('button', { name: 'Étiqueter la pose Folded Leaf' }));

    expect(
      screen.getByText(
        "Une modification de Folded Leaf attend déjà d'être validée. Décide d'abord de cette modification, puis étiquette la pose.",
      ),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole('alert')).getByRole('link', { name: 'Propositions à valider' }),
    ).toHaveAttribute('href', '/propositions-a-valider');
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Enregistrer les étiquettes' })).not.toBeInTheDocument();
  });

  it('should tell why the tags were not recorded and keep the zone open', async () => {
    const poseTagging = new FakePoseTaggingGateway();
    poseTagging.answer.set(fail({ kind: 'tags-not-applicable', tagIds: [tagOf('lunaire').id] }));
    const { user } = open({ gateway: validator(), poseTagging });

    await user.click(await screen.findByRole('button', { name: 'Étiqueter la pose Folded Leaf' }));
    await user.click(screen.getByRole('button', { name: 'Enregistrer les étiquettes' }));

    expect(await screen.findByText(/ne s'applique plus aux poses/)).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Étiquettes de la pose' })).toBeInTheDocument();
  });

  // Story 9a (etiqueter-une-pose-publiee.feature): nothing to choose, nothing to offer.
  it('should not invite a validator to tag a pose when no tag of the list applies to poses', async () => {
    renderSite('/poses/pose-leaf', {
      posePage: new FakePosePageGateway(ok(foldedLeaf({ tags: [] }))),
      gateway: validator(),
      tags: new FakeTagListGateway(ok(seededTags.map((tag) => ({ ...tag, scope: 'transitions' as const })))),
      queryClient: new QueryClient({ defaultOptions: { queries: { retry: false } } }),
    });

    await screen.findByRole('heading', { level: 1, name: 'Folded Leaf' });
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: /Étiqueter la pose/ })).not.toBeInTheDocument(),
    );
    // Read once the list is loaded: the button must not appear afterwards either.
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(screen.queryByRole('button', { name: /Étiqueter la pose/ })).not.toBeInTheDocument();
  });
});
