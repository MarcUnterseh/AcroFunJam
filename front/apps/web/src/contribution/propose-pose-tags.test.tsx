import { fail, ok } from '@acrofunjam/core';
import { QueryClient } from '@tanstack/react-query';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { FakeAuthGateway, FakeContributionGateway, renderSite, seededTags } from '../test/site-harness';

// Story 9a « Étiqueter les poses »: the tags of a proposed pose, in the form « Proposer une pose »
// (docs/design/ecrans/9a-etiquettes-des-poses.md § 4, Q181).

const signedIn = () => {
  const gateway = new FakeAuthGateway();
  gateway.account = { email: 'alice@example.org', capabilities: ['propose'] };
  return gateway;
};

const tagOf = (name: string) => seededTags.find((tag) => tag.name === name)!;

const openForm = async (contribution = new FakeContributionGateway()) => {
  renderSite('/proposer-une-pose', { gateway: signedIn(), contribution, queryClient: new QueryClient() });
  await screen.findByRole('form', { name: 'Proposer une pose' });
  return { contribution, user: userEvent.setup() };
};

const fillStraddleBat = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.type(screen.getByRole('textbox', { name: 'Nom de la pose' }), 'Straddle Bat');
  await user.click(
    within(screen.getByRole('group', { name: 'Difficulté base' })).getByRole('radio', { name: 'Débutant' }),
  );
  await user.click(
    within(screen.getByRole('group', { name: 'Difficulté flyer' })).getByRole('radio', { name: 'Débutant' }),
  );
  await user.click(
    within(screen.getByRole('group', { name: 'Peut-on commencer un flow sur cette pose ?' })).getByRole(
      'radio',
      { name: 'Oui' },
    ),
  );
  await user.click(
    within(screen.getByRole('group', { name: 'Peut-on terminer un flow sur cette pose ?' })).getByRole(
      'radio',
      { name: 'Oui' },
    ),
  );
};

describe('the tags of a proposed pose', () => {
  it('should offer exactly the tags that apply to poses, optional, with their help', async () => {
    await openForm();

    const tags = await screen.findByRole('group', { name: 'Étiquettes (facultatives)' });
    expect(
      within(tags)
        .getAllByRole('checkbox')
        .map((box) => box.closest('label')?.textContent),
    ).toEqual(['inversion', 'lunaire']);
    expect(tags).toHaveAccessibleDescription(/Choisis celles qui décrivent la pose\./);
    expect(
      screen.getByText('Les étiquettes sont facultatives ; les autres champs sont obligatoires.'),
    ).toBeInTheDocument();
  });

  it('should present no tags, and say every field is required, when none applies to poses', async () => {
    const contribution = new FakeContributionGateway();
    contribution.tags.set(ok(seededTags.filter((tag) => tag.scope === 'transitions')));
    await openForm(contribution);

    expect(await screen.findByText('Tous les champs sont obligatoires.')).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Étiquettes (facultatives)' })).not.toBeInTheDocument();
  });

  it('should send the chosen tags with the pose', async () => {
    const { contribution, user } = await openForm();
    await fillStraddleBat(user);

    await user.click(await screen.findByRole('checkbox', { name: 'lunaire' }));
    await user.click(screen.getByRole('button', { name: 'Proposer la pose' }));

    expect(contribution.sent[0]?.tags).toEqual([{ id: tagOf('lunaire').id, name: 'lunaire' }]);
  });

  it('should tell a tag that no longer applies to poses, and keep the input without it', async () => {
    const contribution = new FakeContributionGateway(
      fail({ kind: 'tags-not-applicable', tagIds: [tagOf('lunaire').id] }),
    );
    const { user } = await openForm(contribution);
    await fillStraddleBat(user);
    await user.click(await screen.findByRole('checkbox', { name: 'lunaire' }));
    await user.click(screen.getByRole('checkbox', { name: 'inversion' }));

    await user.click(screen.getByRole('button', { name: 'Proposer la pose' }));

    expect(
      await screen.findByText(
        "L'étiquette « lunaire » ne s'applique plus aux poses. Vérifie tes étiquettes, puis envoie de nouveau ta pose.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Nom de la pose' })).toHaveValue('Straddle Bat');
    expect(screen.getByRole('checkbox', { name: 'inversion' })).toBeChecked();
    expect(screen.queryByRole('checkbox', { name: 'lunaire', checked: true })).not.toBeInTheDocument();
  });
});
