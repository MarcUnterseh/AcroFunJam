import { fail, ok } from '@acrofunjam/core';
import { QueryClient } from '@tanstack/react-query';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import {
  FakeAuthGateway,
  FakeTransitionProposalGateway,
  MemoryTransitionInputStore,
  renderSite,
  seededTags,
  tagNamed,
} from '../test/site-harness';

// Story 8 « Étiquettes »: the group « Étiquettes » of the form « Proposer une transition »
// (docs/design/ecrans/8-etiquettes.md, groupe-cases-pastilles.md).

const path = '/poses/pose-throne/proposer-une-transition';
const alice = 'alice@example.org';

const open = (
  transitions = new FakeTransitionProposalGateway(),
  transitionStore = new MemoryTransitionInputStore(),
) => {
  const gateway = new FakeAuthGateway();
  gateway.account = { email: alice, capabilities: ['propose'] };
  const view = renderSite(path, { gateway, transitions, transitionStore, queryClient: new QueryClient() });
  return { ...view, user: userEvent.setup() };
};

const form = () => screen.findByRole('form', { name: 'Proposer une transition' });
const tags = () => screen.getByRole('group', { name: 'Étiquettes (facultatives)' });
const box = (name: string) => within(tags()).getByRole('checkbox', { name });

const fill = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.selectOptions(screen.getByRole('combobox', { name: "Pose d'arrivée" }), 'Bird');
  await user.click(
    within(screen.getByRole('group', { name: 'Difficulté base' })).getByRole('radio', { name: 'Débutant' }),
  );
  await user.click(
    within(screen.getByRole('group', { name: 'Difficulté flyer' })).getByRole('radio', { name: 'Débutant' }),
  );
};

const submit = (user: ReturnType<typeof userEvent.setup>) =>
  user.click(screen.getByRole('button', { name: 'Proposer la transition' }));

describe('the tags of the form « Proposer une transition »', () => {
  it('should offer every tag of the list, none checked, between the difficulties and the description', async () => {
    open();

    await form();
    expect(
      within(tags())
        .getAllByRole('checkbox')
        .map((b) => b.closest('label')?.textContent),
    ).toEqual(seededTags.map((tag) => tag.name));
    expect(
      within(tags())
        .getAllByRole('checkbox')
        .some((b) => (b as HTMLInputElement).checked),
    ).toBe(false);
    expect(tags()).toHaveAccessibleDescription(/^Choisis celles qui décrivent le passage\./);
    const order = [
      screen.getByRole('group', { name: 'Difficulté flyer' }),
      tags(),
      screen.getByRole('textbox', { name: 'Description (facultative)' }),
    ];
    expect(order[0]!.compareDocumentPosition(order[1]!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(order[1]!.compareDocumentPosition(order[2]!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('should let the person read what each tag means', async () => {
    const { user } = open();

    await form();
    await user.click(within(tags()).getByText('Ce que veulent dire les étiquettes'));

    expect(within(tags()).getByText('Le flyer passe tête en bas.')).toBeVisible();
  });

  it('should check « dynamique » too when « pop » is chosen, and explain which tags add it', async () => {
    const { user } = open();

    await form();
    await user.click(box('pop'));

    expect(box('dynamique')).toBeChecked();
    expect(
      within(tags()).getByText(
        "« dynamique » est ajoutée : « icarien », « pop » et « whip » l'ajoutent toujours.",
      ),
    ).toBeInTheDocument();
  });

  it('should send the chosen tags with the tags they add', async () => {
    const transitions = new FakeTransitionProposalGateway();
    const { user } = open(transitions);

    await form();
    await fill(user);
    await user.click(box('pop'));
    await submit(user);

    await screen.findByRole('heading', { level: 2, name: 'Merci, ta transition est envoyée.' });
    expect(transitions.sent[0]?.tags).toEqual([tagNamed('dynamique'), tagNamed('pop')]);
  });

  it('should tell a chosen tag left the list meanwhile, keep the input without it, and read the list again', async () => {
    const transitions = new FakeTransitionProposalGateway();
    transitions.answer.set(fail({ kind: 'tags-not-in-list', tagIds: ['tag-vrille'] }));
    const { user } = open(transitions);

    await form();
    await fill(user);
    await user.click(box('pop'));
    await user.click(box('vrille'));
    transitions.tags.set(ok(seededTags.filter((tag) => tag.name !== 'vrille')));
    await submit(user);

    expect(
      await screen.findByText(
        "L'étiquette « vrille » ne fait plus partie de la liste des étiquettes. Vérifie tes étiquettes, puis envoie de nouveau ta transition.",
      ),
    ).toBeInTheDocument();
    expect(await within(tags()).findAllByRole('checkbox')).toHaveLength(seededTags.length - 1);
    expect(within(tags()).queryByRole('checkbox', { name: 'vrille' })).not.toBeInTheDocument();
    expect(box('pop')).toBeChecked();
    expect(screen.getByRole('combobox', { name: "Pose d'arrivée" })).toHaveValue('pose-bird');
  });

  it('should give back the kept tags with the kept input', async () => {
    const transitionStore = new MemoryTransitionInputStore();
    transitionStore.save('pose-throne', {
      owner: alice,
      input: {
        fromPoseId: 'pose-throne',
        toPoseId: 'pose-bird',
        name: '',
        baseDifficulty: null,
        flyerDifficulty: null,
        description: '',
        tags: [tagNamed('inversion')],
      },
    });
    open(undefined, transitionStore);

    await form();
    expect(box('inversion')).toBeChecked();
  });
});
