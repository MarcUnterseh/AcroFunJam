import { fail, ok, type LinkedTransition, type PosePage } from '@acrofunjam/core';
import { QueryClient } from '@tanstack/react-query';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import {
  FakeAuthGateway,
  FakePosePageGateway,
  FakeTagListGateway,
  FakeTransitionTaggingGateway,
  renderSite,
  seededTags,
} from '../test/site-harness';

// Story 8 « Étiquettes »: the tags of the transitions on the page of a pose, and the zone « Étiqueter » of the
// validators (docs/design/ecrans/8-etiquettes.md, pilule-etiquette.md, repli-descriptions-etiquettes.md,
// zone-etiqueter.md).

const tagOf = (name: string) => {
  const { id, description } = seededTags.find((tag) => tag.name === name)!;
  return { id, name, description };
};

const popToBird: LinkedTransition = {
  id: 't-pop-to-bird',
  otherPose: { id: 'pose-bird', name: 'Bird' },
  name: 'Pop to Bird',
  baseDifficulty: 'intermediate',
  flyerDifficulty: 'intermediate',
  description: null,
  tags: [tagOf('dynamique'), tagOf('pop')],
};

const throneToBird: LinkedTransition = {
  id: 't-throne-bird',
  otherPose: { id: 'pose-bird', name: 'Bird' },
  name: null,
  baseDifficulty: 'beginner',
  flyerDifficulty: 'beginner',
  description: null,
  tags: [],
};

const throne = (transitionsFrom: LinkedTransition[] = [throneToBird, popToBird]): PosePage => ({
  id: 'pose-throne',
  name: 'Throne',
  baseDifficulty: 'beginner',
  flyerDifficulty: 'discovery',
  canStartFlow: true,
  canEndFlow: false,
  transitionsFrom,
  transitionsTo: [],
  tags: [],
  pendingRevision: false,
});

const validator = () => {
  const gateway = new FakeAuthGateway();
  gateway.account = {
    email: 'bruno@example.org',
    capabilities: ['propose', 'validate-proposals', 'manage-tags'],
  };
  return gateway;
};

const user = () => {
  const gateway = new FakeAuthGateway();
  gateway.account = { email: 'alice@example.org' };
  return gateway;
};

const open = ({
  page = new FakePosePageGateway(ok(throne())),
  gateway = new FakeAuthGateway(),
  tagging = new FakeTransitionTaggingGateway(),
  tags = new FakeTagListGateway(ok(seededTags)),
} = {}) => {
  const view = renderSite('/poses/pose-throne', {
    posePage: page,
    gateway,
    tagging,
    tags,
    queryClient: new QueryClient({ defaultOptions: { queries: { retry: false } } }),
  });
  return { ...view, page, tagging, user: userEvent.setup() };
};

/** The item of a transition, by its title. */
const transition = async (title: string | RegExp) =>
  within((await screen.findByRole('heading', { level: 3, name: title })).closest('li')!);

describe('the tags of the transitions on the page of a pose', () => {
  it('should present the tags of a transition in a line « Étiquettes », in the order received', async () => {
    open();

    const item = await transition('Pop to Bird');
    const line = item.getByRole('list', { name: 'Étiquettes' });
    expect(
      within(line)
        .getAllByRole('listitem')
        .map((pill) => pill.textContent),
    ).toEqual(['dynamique', 'pop']);
  });

  it('should present neither line nor fold for a transition without tags', async () => {
    open();

    const item = await transition('de Throne vers Bird');
    expect(item.queryByRole('list', { name: 'Étiquettes' })).not.toBeInTheDocument();
    expect(item.queryByText('Ce que veulent dire ces étiquettes')).not.toBeInTheDocument();
  });

  it('should let the visitor read the description of each tag of the transition in a fold', async () => {
    const { user: person } = open();

    const item = await transition('Pop to Bird');
    await person.click(item.getByText('Ce que veulent dire ces étiquettes'));

    expect(
      item.getByText(
        "La base propulse le flyer, qui quitte un instant tout contact avec elle avant d'être rattrapé.",
      ),
    ).toBeVisible();
  });

  it('should not invite a visitor nor a user to tag a transition', async () => {
    open({ gateway: user() });

    await transition('Pop to Bird');
    expect(screen.queryByRole('button', { name: /^Étiqueter/ })).not.toBeInTheDocument();
  });
});

describe('the zone « Étiqueter » of a validator', () => {
  it('should invite a validator to tag every transition, even one without tags, naming it', async () => {
    open({ gateway: validator() });

    await transition('Pop to Bird');
    expect(await screen.findByRole('button', { name: 'Étiqueter de Throne vers Bird' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Étiqueter Pop to Bird' })).toBeInTheDocument();
  });

  // Story 9a (ADR 0035): a tag reserved to the poses is never offered for a transition.
  it('should not offer a tag that applies only to poses', async () => {
    const contrepoids = {
      ...seededTags[0]!,
      id: 'tag-contrepoids',
      name: 'contrepoids',
      scope: 'poses' as const,
    };
    const { user: person } = open({
      gateway: validator(),
      tags: new FakeTagListGateway(ok([...seededTags, contrepoids])),
    });

    await person.click(await screen.findByRole('button', { name: 'Étiqueter Pop to Bird' }));

    const group = await screen.findByRole('group', { name: 'Étiquettes de la transition' });
    expect(within(group).getByRole('checkbox', { name: 'pop' })).toBeInTheDocument();
    expect(within(group).queryByRole('checkbox', { name: 'contrepoids' })).not.toBeInTheDocument();
  });

  it('should open on the tags of the transition checked', async () => {
    const { user: person } = open({ gateway: validator() });

    await person.click(await screen.findByRole('button', { name: 'Étiqueter Pop to Bird' }));

    const group = await screen.findByRole('group', { name: 'Étiquettes de la transition' });
    const checked = within(group)
      .getAllByRole('checkbox')
      .filter((box) => (box as HTMLInputElement).checked)
      .map((box) => box.closest('label')?.textContent);
    expect(checked).toEqual(['dynamique', 'pop']);
  });

  it('should record the chosen tags, then present the page read again, the zone closed', async () => {
    const page = new FakePosePageGateway(
      ok(throne()),
      ok(throne([{ ...throneToBird, tags: [tagOf('lunaire')] }, popToBird])),
    );
    const { user: person, tagging } = open({ gateway: validator(), page });

    await person.click(await screen.findByRole('button', { name: 'Étiqueter de Throne vers Bird' }));
    await person.click(await screen.findByRole('checkbox', { name: 'lunaire' }));
    await person.click(screen.getByRole('button', { name: 'Enregistrer les étiquettes' }));

    expect(tagging.sent).toEqual([{ transitionId: 't-throne-bird', tagIds: ['tag-lunaire'] }]);
    const item = await transition('de Throne vers Bird');
    await waitFor(() => expect(item.getByRole('list', { name: 'Étiquettes' })).toHaveTextContent('lunaire'));
    expect(screen.queryByRole('group', { name: 'Étiquettes de la transition' })).not.toBeInTheDocument();
    expect(await screen.findByText('Étiquettes enregistrées.')).toBeInTheDocument();
  });

  it('should check « dynamique » with « pop » and explain which tags add it', async () => {
    const { user: person } = open({ gateway: validator() });

    await person.click(await screen.findByRole('button', { name: 'Étiqueter de Throne vers Bird' }));
    await person.click(await screen.findByRole('checkbox', { name: 'pop' }));

    expect(screen.getByRole('checkbox', { name: 'dynamique' })).toBeChecked();
    expect(
      screen.getByText("« dynamique » est ajoutée : « icarien », « pop » et « whip » l'ajoutent toujours."),
    ).toBeInTheDocument();
  });

  it('should keep « dynamique » checked while « pop » stays chosen', async () => {
    const { user: person } = open({ gateway: validator() });

    await person.click(await screen.findByRole('button', { name: 'Étiqueter Pop to Bird' }));
    await person.click(await screen.findByRole('checkbox', { name: 'dynamique' }));

    expect(screen.getByRole('checkbox', { name: 'dynamique' })).toBeChecked();
  });

  it('should close the zone without sending anything on « Annuler »', async () => {
    const { user: person, tagging } = open({ gateway: validator() });

    await person.click(await screen.findByRole('button', { name: 'Étiqueter Pop to Bird' }));
    await person.click(await screen.findByRole('button', { name: 'Annuler' }));

    expect(tagging.sent).toEqual([]);
    expect(screen.getByRole('button', { name: 'Étiqueter Pop to Bird' })).toHaveFocus();
  });

  it('should tell why the tags were not recorded and keep the zone open', async () => {
    const tagging = new FakeTransitionTaggingGateway();
    tagging.answer.set(fail({ kind: 'unreachable' }));
    const { user: person } = open({ gateway: validator(), tagging });

    await person.click(await screen.findByRole('button', { name: 'Étiqueter Pop to Bird' }));
    await person.click(await screen.findByRole('button', { name: 'Enregistrer les étiquettes' }));

    expect(
      await screen.findByText(
        "Les étiquettes n'ont pas pu être enregistrées : impossible de joindre AcroFunJam. Vérifie ta connexion Internet, puis réessaie.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Étiquettes de la transition' })).toBeInTheDocument();
  });
});
