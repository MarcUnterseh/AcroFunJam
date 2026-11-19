import { fail, ok, type Tag } from '@acrofunjam/core';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { FakeAuthGateway, FakeTagListGateway, renderSite } from '../test/site-harness';

// Story 9a « Étiqueter les poses »: what each tag applies to, on the page « Étiquettes » (ADR 0035,
// docs/design/ecrans/9a-etiquettes-des-poses.md, § 3).

const lunaire: Tag = {
  id: 'tag-lunaire',
  name: 'lunaire',
  description: 'Pratique thérapeutique.',
  scope: 'poses-and-transitions',
  impliedTagId: null,
  poseCount: 1,
  transitionCount: 2,
};

const contrepoids: Tag = {
  id: 'tag-contrepoids',
  name: 'contrepoids',
  description: "Base et flyer s'équilibrent.",
  scope: 'poses',
  impliedTagId: null,
  poseCount: 0,
  transitionCount: 0,
};

const pop: Tag = {
  id: 'tag-pop',
  name: 'pop',
  description: 'La base propulse le flyer.',
  scope: 'transitions',
  impliedTagId: null,
  poseCount: 0,
  transitionCount: 2,
};

const validator = () => {
  const gateway = new FakeAuthGateway();
  gateway.account = {
    email: 'bruno@example.org',
    capabilities: ['propose', 'validate-proposals', 'manage-tags'],
  };
  return gateway;
};

const open = (
  tags = new FakeTagListGateway(ok([contrepoids, lunaire, pop])),
  gateway = new FakeAuthGateway(),
) => {
  renderSite('/etiquettes', { tags, gateway });
  return { tags, user: userEvent.setup() };
};

const item = (name: string) => screen.getByRole('heading', { level: 2, name }).closest('li')!;

describe('page « Étiquettes », what each tag applies to', () => {
  it('should introduce the tags as describing the poses and the transitions', async () => {
    open();

    expect(
      await screen.findByText(
        "Les étiquettes décrivent les poses et les transitions. Le futur générateur de flow s'en servira.",
      ),
    ).toBeInTheDocument();
  });

  it('should state under its name what each tag applies to, for everybody', async () => {
    open();

    await screen.findByRole('heading', { level: 2, name: 'lunaire' });
    expect(within(item('contrepoids')).getByText("S'applique aux poses")).toBeInTheDocument();
    expect(within(item('pop')).getByText("S'applique aux transitions")).toBeInTheDocument();
    expect(within(item('lunaire')).getByText("S'applique aux poses et aux transitions")).toBeInTheDocument();
  });

  it('should count the poses and the transitions carrying a tag, among what it applies to', async () => {
    open(undefined, validator());

    await screen.findByRole('heading', { level: 2, name: 'lunaire' });
    expect(within(item('lunaire')).getByText('Portée par 1 pose et 2 transitions')).toBeInTheDocument();
    expect(within(item('contrepoids')).getByText('Portée par aucune pose')).toBeInTheDocument();
    expect(within(item('pop')).getByText('Portée par 2 transitions')).toBeInTheDocument();
  });

  it('should add a tag with what it applies to, chosen among three, none chosen at first', async () => {
    const tags = new FakeTagListGateway(ok([lunaire]), ok([contrepoids, lunaire]));
    tags.changes.set(ok(contrepoids));
    const { user } = open(tags, validator());
    const panel = await screen.findByRole('region', { name: 'Ajouter une étiquette' });
    const scope = within(panel).getByRole('group', { name: "S'applique à" });

    expect(
      within(scope)
        .getAllByRole('radio')
        .map((radio) => radio.getAttribute('value')),
    ).toEqual(['poses', 'transitions', 'poses-and-transitions']);
    expect(
      within(scope)
        .getAllByRole('radio')
        .some((radio) => (radio as HTMLInputElement).checked),
    ).toBe(false);
    await user.type(within(panel).getByLabelText('Nom'), 'contrepoids');
    await user.type(within(panel).getByLabelText('Description'), "Base et flyer s'équilibrent.");
    await user.click(within(scope).getByRole('radio', { name: 'Aux poses' }));
    await user.click(within(panel).getByRole('button', { name: "Ajouter l'étiquette" }));

    expect(tags.added).toEqual([
      { name: 'contrepoids', description: "Base et flyer s'équilibrent.", scope: 'poses' },
    ]);
    expect(await screen.findByRole('heading', { level: 2, name: 'contrepoids' })).toBeInTheDocument();
    expect(
      within(scope)
        .getAllByRole('radio')
        .some((radio) => (radio as HTMLInputElement).checked),
    ).toBe(false);
  });

  it('should ask to choose what a tag applies to, and send nothing, when none is chosen', async () => {
    const tags = new FakeTagListGateway(ok([lunaire]));
    const { user } = open(tags, validator());
    const panel = await screen.findByRole('region', { name: 'Ajouter une étiquette' });

    await user.type(within(panel).getByLabelText('Nom'), 'contrepoids');
    await user.type(within(panel).getByLabelText('Description'), "Base et flyer s'équilibrent.");
    await user.click(within(panel).getByRole('button', { name: "Ajouter l'étiquette" }));

    expect(tags.added).toEqual([]);
    expect(within(panel).getByRole('group', { name: "S'applique à" })).toHaveAccessibleDescription(
      /Choisis à quoi s'applique l'étiquette/,
    );
    // The focus goes to the first field in error: the first tile of the group (story 9a, ux-expert).
    expect(within(panel).getByRole('radio', { name: 'Aux poses' })).toHaveFocus();
  });

  it('should change what a tag applies to in place, its current value checked', async () => {
    const vrille: Tag = { ...pop, id: 'tag-vrille', name: 'vrille', transitionCount: 0 };
    const widened: Tag = { ...vrille, scope: 'poses-and-transitions' };
    const tags = new FakeTagListGateway(ok([vrille]), ok([widened]));
    tags.changes.set(ok(widened));
    const { user } = open(tags, validator());
    await user.click(await screen.findByRole('button', { name: 'Modifier vrille' }));
    const scope = within(item('vrille')).getByRole('group', { name: "S'applique à" });

    expect(within(scope).getByRole('radio', { name: 'Aux transitions' })).toBeChecked();
    await user.click(within(scope).getByRole('radio', { name: 'Aux poses et aux transitions' }));
    await user.click(within(item('vrille')).getByRole('button', { name: 'Enregistrer' }));

    expect(tags.changed).toEqual([
      {
        id: 'tag-vrille',
        content: { name: 'vrille', description: vrille.description, scope: 'poses-and-transitions' },
      },
    ]);
    expect(
      await within(item('vrille')).findByText("S'applique aux poses et aux transitions"),
    ).toBeInTheDocument();
  });

  it('should list the poses that forbid a tag to cease applying to poses, with a link to their page, the input kept', async () => {
    const tags = new FakeTagListGateway(ok([lunaire]));
    tags.changes.set(
      fail({
        kind: 'carried',
        poses: [{ id: 'pose-leaf', name: 'Folded Leaf' }],
        transitions: [],
        pendingProposals: [],
        pendingPoses: [{ id: 'r-1', kind: 'pose-revision', name: 'Throne' }],
      }),
    );
    const { user } = open(tags, validator());
    await user.click(await screen.findByRole('button', { name: 'Modifier lunaire' }));
    await user.click(within(item('lunaire')).getByRole('radio', { name: 'Aux transitions' }));
    await user.click(within(item('lunaire')).getByRole('button', { name: 'Enregistrer' }));

    const alert = await within(item('lunaire')).findByRole('alert');
    expect(alert).toHaveTextContent(
      "« lunaire » ne peut pas cesser de s'appliquer aux poses : ces éléments la portent.",
    );
    expect(within(alert).getByText('Poses du catalogue')).toBeInTheDocument();
    expect(within(alert).getByRole('link', { name: 'Folded Leaf' })).toHaveAttribute(
      'href',
      '/poses/pose-leaf',
    );
    expect(within(alert).getByText('Modification de la pose Throne')).toBeInTheDocument();
    expect(within(item('lunaire')).getByRole('radio', { name: 'Aux transitions' })).toBeChecked();
  });

  it('should name the tags that still need what a tag applies to when they forbid narrowing it', async () => {
    const dynamique: Tag = { ...lunaire, id: 'tag-dynamique', name: 'dynamique' };
    const tags = new FakeTagListGateway(ok([dynamique]));
    tags.changes.set(fail({ kind: 'scope-needed-by-impliers', impliedBy: [{ id: 'tag-pop', name: 'pop' }] }));
    const { user } = open(tags, validator());
    await user.click(await screen.findByRole('button', { name: 'Modifier dynamique' }));
    await user.click(within(item('dynamique')).getByRole('radio', { name: 'Aux poses' }));
    await user.click(within(item('dynamique')).getByRole('button', { name: 'Enregistrer' }));

    expect(await within(item('dynamique')).findByRole('alert')).toHaveTextContent(
      "« dynamique » doit garder ce champ d'application tant que « pop » l'ajoute.",
    );
  });

  it('should list the poses and the pending pose proposals that forbid removing a tag', async () => {
    const tags = new FakeTagListGateway(ok([lunaire]));
    tags.removals.set(
      fail({
        kind: 'carried',
        poses: [{ id: 'pose-leaf', name: 'Folded Leaf' }],
        transitions: [],
        pendingProposals: [],
        pendingPoses: [{ id: 'pp-1', kind: 'pose-proposal', name: 'Candlestick' }],
      }),
    );
    const { user } = open(tags, validator());
    await user.click(await screen.findByRole('button', { name: 'Retirer lunaire' }));
    await user.click(within(item('lunaire')).getByRole('button', { name: "Retirer l'étiquette" }));

    const alert = await within(item('lunaire')).findByRole('alert');
    expect(alert).toHaveTextContent('« lunaire » ne peut pas être retirée : ces éléments la portent.');
    expect(within(alert).getByRole('link', { name: 'Folded Leaf' })).toHaveAttribute(
      'href',
      '/poses/pose-leaf',
    );
    await waitFor(() =>
      expect(within(alert).getByText('Proposition de la pose Candlestick')).toBeInTheDocument(),
    );
  });
});
