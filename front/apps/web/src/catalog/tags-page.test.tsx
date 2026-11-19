import { fail, ok, type Tag } from '@acrofunjam/core';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { FakeAuthGateway, FakeTagListGateway, FakeValidationGateway, renderSite } from '../test/site-harness';

// Story 8, part 1: the page « Étiquettes » (docs/design/ecrans/8-etiquettes.md, element-etiquette.md).

const pop: Tag = {
  id: 'tag-pop',
  name: 'pop',
  description: 'La base propulse le flyer.',
  scope: 'transitions',
  impliedTagId: 'tag-dynamique',
  poseCount: 0,
  transitionCount: 2,
};

const vrille: Tag = {
  id: 'tag-vrille',
  name: 'vrille',
  description: 'Le flyer tourne sur lui-même.',
  scope: 'transitions',
  impliedTagId: null,
  poseCount: 0,
  transitionCount: 0,
};

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

const open = (tags = new FakeTagListGateway(ok([pop, vrille])), gateway = new FakeAuthGateway()) => {
  const view = renderSite('/etiquettes', { tags, gateway });
  return { ...view, tags, user: userEvent.setup() };
};

const item = (name: string) => screen.getByRole('heading', { level: 2, name }).closest('li')!;

describe('page « Étiquettes »', () => {
  it('should present every tag with its description when a visitor opens it', async () => {
    open();

    expect(await screen.findByRole('heading', { level: 1, name: 'Étiquettes' })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { level: 2, name: 'pop' })).toBeInTheDocument();
    expect(within(item('pop')).getByText('La base propulse le flyer.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Catalogue' })).toHaveAttribute('href', '/');
  });

  it('should not invite a user to add, change or remove a tag', async () => {
    open(undefined, user());

    await screen.findByRole('heading', { level: 2, name: 'pop' });
    expect(screen.queryByRole('heading', { name: 'Ajouter une étiquette' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Modifier|Retirer/ })).not.toBeInTheDocument();
    expect(screen.queryByText('Portée par 2 transitions')).not.toBeInTheDocument();
  });

  it('should tell an empty list when every tag has been removed', async () => {
    open(new FakeTagListGateway(ok([])));

    expect(await screen.findByText("Aucune étiquette pour l'instant.")).toBeInTheDocument();
  });

  it('should offer to try again when the list cannot be loaded', async () => {
    const tags = new FakeTagListGateway(fail({ kind: 'unreachable' }), ok([pop]));
    const { user: person } = open(tags);

    await person.click(await screen.findByRole('button', { name: 'Réessayer' }));

    expect(await screen.findByRole('heading', { level: 2, name: 'pop' })).toBeInTheDocument();
  });

  describe('for a validator', () => {
    it('should tell how many published transitions carry each tag', async () => {
      open(undefined, validator());

      await screen.findByRole('heading', { level: 2, name: 'pop' });
      expect(within(item('pop')).getByText('Portée par 2 transitions')).toBeInTheDocument();
      expect(within(item('vrille')).getByText('Portée par aucune transition')).toBeInTheDocument();
    });

    it('should add a tag, empty the fields and present it in the list', async () => {
      const tags = new FakeTagListGateway(ok([pop]), ok([pop, vrille]));
      tags.changes.set(ok(vrille));
      const { user: person } = open(tags, validator());
      const panel = await screen.findByRole('region', { name: 'Ajouter une étiquette' });

      await person.type(within(panel).getByLabelText('Nom'), '  vrille ');
      await person.type(within(panel).getByLabelText('Description'), 'Le flyer tourne sur lui-même.');
      await person.click(within(panel).getByRole('radio', { name: 'Aux transitions' }));
      await person.click(within(panel).getByRole('button', { name: "Ajouter l'étiquette" }));

      expect(tags.added).toEqual([
        { name: 'vrille', description: 'Le flyer tourne sur lui-même.', scope: 'transitions' },
      ]);
      expect(await screen.findByRole('heading', { level: 2, name: 'vrille' })).toBeInTheDocument();
      expect(within(panel).getByLabelText('Nom')).toHaveValue('');
      expect(within(panel).getByLabelText('Description')).toHaveValue('');
    });

    it('should show the counters of the fields, always', async () => {
      const { user: person } = open(undefined, validator());
      const panel = await screen.findByRole('region', { name: 'Ajouter une étiquette' });

      expect(within(panel).getByText('0 / 30')).toBeInTheDocument();
      await person.type(within(panel).getByLabelText('Nom'), 'pop');
      expect(within(panel).getByText('3 / 30')).toBeInTheDocument();
      expect(within(panel).getByText('0 / 200')).toBeInTheDocument();
    });

    it('should tell under the name that a tag of this name exists, the input kept', async () => {
      const tags = new FakeTagListGateway(ok([pop]));
      tags.changes.set(fail({ kind: 'name-taken' }));
      const { user: person } = open(tags, validator());
      const panel = await screen.findByRole('region', { name: 'Ajouter une étiquette' });

      await person.type(within(panel).getByLabelText('Nom'), 'POP');
      await person.type(within(panel).getByLabelText('Description'), 'Le flyer décolle.');
      await person.click(within(panel).getByRole('radio', { name: 'Aux transitions' }));
      await person.click(within(panel).getByRole('button', { name: "Ajouter l'étiquette" }));

      const name = within(panel).getByLabelText('Nom');
      await waitFor(() =>
        expect(name).toHaveAccessibleDescription(/Une étiquette de ce nom existe déjà dans la liste/),
      );
      expect(name).toHaveValue('POP');
    });

    it('should send nothing and explain the rules broken when the input is invalid', async () => {
      const tags = new FakeTagListGateway(ok([pop]));
      const { user: person } = open(tags, validator());
      const panel = await screen.findByRole('region', { name: 'Ajouter une étiquette' });

      await person.click(within(panel).getByRole('button', { name: "Ajouter l'étiquette" }));

      expect(tags.added).toEqual([]);
      expect(within(panel).getByLabelText('Nom')).toHaveAccessibleDescription(
        /Le nom de l'étiquette est obligatoire/,
      );
      expect(within(panel).getByLabelText('Description')).toHaveAccessibleDescription(
        /La description de l'étiquette est obligatoire/,
      );
    });

    it('should rename a tag in place', async () => {
      const lunaire = { ...pop, id: 'tag-lunaire', name: 'lunaire', impliedTagId: null };
      const tags = new FakeTagListGateway(ok([{ ...lunaire, name: 'lunnaire' }]), ok([lunaire]));
      tags.changes.set(ok(lunaire));
      const { user: person } = open(tags, validator());
      await screen.findByRole('heading', { level: 2, name: 'lunnaire' });

      await person.click(screen.getByRole('button', { name: 'Modifier lunnaire' }));
      const name = within(item('lunnaire')).getByLabelText('Nom');
      await person.clear(name);
      await person.type(name, 'lunaire');
      await person.click(within(item('lunnaire')).getByRole('button', { name: 'Enregistrer' }));

      expect(tags.changed).toEqual([
        {
          id: 'tag-lunaire',
          content: { name: 'lunaire', description: lunaire.description, scope: 'transitions' },
        },
      ]);
      expect(await screen.findByRole('heading', { level: 2, name: 'lunaire' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Enregistrer' })).not.toBeInTheDocument();
    });

    it('should leave the tag as it was when the change is cancelled', async () => {
      const tags = new FakeTagListGateway(ok([pop]));
      const { user: person } = open(tags, validator());
      await person.click(await screen.findByRole('button', { name: 'Modifier pop' }));

      await person.click(within(item('pop')).getByRole('button', { name: 'Annuler' }));

      expect(tags.changed).toEqual([]);
      expect(within(item('pop')).getByText('La base propulse le flyer.')).toBeInTheDocument();
    });

    it('should remove a tag once the removal is confirmed', async () => {
      const tags = new FakeTagListGateway(ok([pop, vrille]), ok([pop]));
      const { user: person } = open(tags, validator());
      await person.click(await screen.findByRole('button', { name: 'Retirer vrille' }));

      expect(within(item('vrille')).getByText('Retirer « vrille » de la liste ?')).toBeInTheDocument();
      await person.click(within(item('vrille')).getByRole('button', { name: "Retirer l'étiquette" }));

      expect(tags.removed).toEqual(['tag-vrille']);
      await waitFor(() =>
        expect(screen.queryByRole('heading', { level: 2, name: 'vrille' })).not.toBeInTheDocument(),
      );
    });

    it('should list the transitions carrying the tag, with a link to their pose, when it cannot be removed', async () => {
      const tags = new FakeTagListGateway(ok([pop]));
      tags.removals.set(
        fail({
          kind: 'carried',
          transitions: [
            {
              id: 't-1',
              fromPose: { id: 'pose-bird', name: 'Bird' },
              toPose: { id: 'pose-leaf', name: 'Folded Leaf' },
              name: null,
            },
          ],
          pendingProposals: [],
          poses: [],
          pendingPoses: [],
        }),
      );
      const { user: person } = open(tags, validator());
      await person.click(await screen.findByRole('button', { name: 'Retirer pop' }));
      await person.click(within(item('pop')).getByRole('button', { name: "Retirer l'étiquette" }));

      const alert = await within(item('pop')).findByRole('alert');
      expect(alert).toHaveTextContent('« pop » ne peut pas être retirée : ces éléments la portent.');
      expect(within(alert).getByText('de Bird vers Folded Leaf')).toBeInTheDocument();
      // jsdom trims the trailing space of the hidden text (« Voir la poseBird »); a browser reads « Voir la pose Bird »
      // (checked by the e2e scenario).
      expect(within(alert).getByRole('link', { name: /^Voir\s+la pose\s*Bird$/ })).toHaveAttribute(
        'href',
        '/poses/pose-bird',
      );
    });

    it('should name the tags that add it when a tag cannot be removed because of them', async () => {
      const dynamique = { ...vrille, id: 'tag-dynamique', name: 'dynamique' };
      const tags = new FakeTagListGateway(ok([dynamique, pop]));
      tags.removals.set(fail({ kind: 'implied', impliedBy: [{ id: 'tag-pop', name: 'pop' }] }));
      const { user: person } = open(tags, validator());
      await person.click(await screen.findByRole('button', { name: 'Retirer dynamique' }));
      await person.click(within(item('dynamique')).getByRole('button', { name: "Retirer l'étiquette" }));

      expect(await within(item('dynamique')).findByRole('alert')).toHaveTextContent(
        "« dynamique » ne peut pas être retirée tant que « pop » l'ajoute.",
      );
    });
  });

  it('should lead from the catalog to the page, for everybody', async () => {
    const view = renderSite('/', { tags: new FakeTagListGateway(ok([pop])) });
    const person = userEvent.setup();

    await person.click(await screen.findByRole('link', { name: 'Étiquettes' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Étiquettes' })).toBeInTheDocument();
    view.unmount();
  });

  it('should lead a validator from the proposals to validate to the management of the tags', async () => {
    renderSite('/propositions-a-valider', {
      gateway: validator(),
      validation: new FakeValidationGateway(),
      tags: new FakeTagListGateway(ok([pop])),
    });

    expect(await screen.findByRole('link', { name: 'Gérer les étiquettes' })).toHaveAttribute(
      'href',
      '/etiquettes',
    );
  });
});
