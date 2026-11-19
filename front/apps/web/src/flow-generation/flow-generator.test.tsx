import { fail, ok, type FlowStep, type GeneratedFlow } from '@acrofunjam/core';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import {
  CurrentLocation,
  FakeFlowGenerationGateway,
  FakeTagListGateway,
  renderSite,
  seededTags,
  tagNamed,
} from '../test/site-harness';

// Story 9 « Générer un flow » (docs/design/ecrans/9-generer-un-flow.md, decisions of 2026-11-19).

const pose = (name: string, overrides: Partial<GeneratedFlow['start']> = {}) => ({
  id: `pose-${name}`,
  name,
  baseDifficulty: 'beginner' as const,
  flyerDifficulty: 'beginner' as const,
  tags: [],
  ...overrides,
});

const step = (
  number: number,
  name: string | null,
  arrival: string,
  overrides: Partial<FlowStep> = {},
): FlowStep => ({
  number,
  transition: {
    id: `t-${number}-${arrival}`,
    name,
    baseDifficulty: 'intermediate',
    flyerDifficulty: 'intermediate',
    description: null,
    tags: [],
  },
  isWashingMachine: false,
  arrival: pose(arrival),
  ...overrides,
});

const throneToLeaf: GeneratedFlow = {
  start: pose('Throne'),
  steps: [step(1, 'Pop to Bird', 'Bird'), step(2, null, 'Folded Leaf')],
};

const generator = '/generer-un-flow';

const generate = async () => userEvent.click(await screen.findByRole('button', { name: 'Générer un flow' }));

describe('flow generator', () => {
  it('should open the generator from the catalog, for a visitor, first of the actions', async () => {
    renderSite('/', { catalog: { listPublishedPoses: async () => ok([]) } }, <CurrentLocation />);

    const link = await screen.findByRole('link', { name: 'Générer un flow' });
    expect(link.parentElement?.firstElementChild).toBe(link);
    await userEvent.click(link);
    expect(await screen.findByRole('heading', { level: 1, name: 'Générer un flow' })).toBeInTheDocument();
  });

  it('should preselect 3 transitions and « débutant » for the base and the flyer, and send them', async () => {
    const flowGeneration = new FakeFlowGenerationGateway(ok(throneToLeaf));
    renderSite(generator, { flowGeneration });

    expect(await screen.findByRole('combobox', { name: 'Nombre de transitions' })).toHaveValue('3');
    expect(
      within(screen.getByRole('group', { name: 'Difficulté base, au plus' })).getByRole('radio', {
        name: 'Débutant',
      }),
    ).toBeChecked();
    expect(
      within(screen.getByRole('group', { name: 'Difficulté flyer, au plus' })).getByRole('radio', {
        name: 'Débutant',
      }),
    ).toBeChecked();
    await generate();

    expect(flowGeneration.sent).toEqual([
      {
        length: 3,
        baseCeiling: 'beginner',
        flyerCeiling: 'beginner',
        requestedTagIds: [],
        excludedTagIds: [],
      },
    ]);
  });

  it('should present the flow: its summary, its start, its numbered steps, and the spotter reminder', async () => {
    renderSite(
      generator,
      { flowGeneration: new FakeFlowGenerationGateway(ok(throneToLeaf)) },
      <CurrentLocation />,
    );
    await generate();

    expect(await screen.findByRole('heading', { level: 1, name: 'Ton flow' })).toHaveFocus();
    expect(screen.getByText('2 transitions, de Throne à Folded Leaf.')).toBeInTheDocument();
    expect(screen.getByText(/Ce flow est tiré au hasard/)).toBeInTheDocument();
    const steps = within(screen.getByRole('list', { name: 'Étapes du flow' }));
    expect(steps.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent)).toHaveLength(2);
    expect(steps.getByRole('heading', { level: 2, name: 'Étape 1 · Pop to Bird' })).toBeInTheDocument();
    expect(
      steps.getByRole('heading', { level: 2, name: 'Étape 2 · de Bird vers Folded Leaf' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Throne' })).toHaveAttribute('href', '/poses/pose-Throne');
    expect(screen.getByLabelText('Adresse courante')).toHaveTextContent(
      '/generer-un-flow?transitions=3&base=beginner&flyer=beginner',
    );
  });

  it('should mark a washing machine and its arrival on the same pose', async () => {
    const ninjaStar: GeneratedFlow = {
      start: pose('Star'),
      steps: [step(1, 'Ninja Star', 'Star', { isWashingMachine: true })],
    };
    renderSite(generator, { flowGeneration: new FakeFlowGenerationGateway(ok(ninjaStar)) });
    await generate();

    const item = within(await screen.findByRole('list', { name: 'Étapes du flow' })).getByRole('listitem');
    expect(item).toHaveTextContent('washing machine');
    expect(screen.getByText('(même pose)')).toBeInTheDocument();
  });

  it('should tell when the same flow came out again', async () => {
    renderSite(generator, { flowGeneration: new FakeFlowGenerationGateway(ok(throneToLeaf)) });
    await generate();
    await userEvent.click(await screen.findByRole('button', { name: 'Générer un autre flow' }));

    expect(
      await screen.findByText(
        'Le même flow est ressorti : avec ces critères, le catalogue offre peu de choix.',
      ),
    ).toBeInTheDocument();
  });

  it('should explain criteria too restrictive with the leads to widen the choice, and let them be changed', async () => {
    const flowGeneration = new FakeFlowGenerationGateway(fail({ kind: 'criteria-too-restrictive' }));
    renderSite(`${generator}?transitions=2&base=beginner&flyer=beginner`, { flowGeneration });
    await generate();

    expect(
      await screen.findByText('Critères trop restrictifs : impossible de générer un flow.'),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual(
      expect.arrayContaining(['moins de transitions ;', 'des plafonds de difficulté plus hauts.']),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Modifier les critères' }));
    expect(await screen.findByRole('combobox', { name: 'Nombre de transitions' })).toHaveValue('2');
  });

  it('should tell a catalog that cannot give a flow yet, and lead to the catalog', async () => {
    renderSite(generator, {
      flowGeneration: new FakeFlowGenerationGateway(fail({ kind: 'catalog-insufficient' })),
    });
    await generate();

    expect(
      await screen.findByText('Le catalogue ne permet pas encore de générer un flow.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Voir le catalogue' })).toHaveAttribute('href', '/');
  });

  it('should tell a generation that could not reach AcroFunJam, and generate on retrying', async () => {
    renderSite(generator, {
      flowGeneration: new FakeFlowGenerationGateway(fail({ kind: 'unreachable' }), ok(throneToLeaf)),
    });
    await generate();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Impossible de générer le flow. Vérifie ta connexion Internet, puis réessaie.',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Réessayer' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Ton flow' })).toBeInTheDocument();
  });

  it('should disable a requested tag in the group of the excluded ones, marked « (demandée) »', async () => {
    renderSite(generator, { tags: new FakeTagListGateway(ok(seededTags)) });
    await userEvent.click(await screen.findByText('Étiquettes (facultatives)'));
    const requested = screen.getByRole('group', { name: "Avec l'une de ces étiquettes" });
    await userEvent.click(within(requested).getByRole('checkbox', { name: 'lunaire' }));

    const excluded = screen.getByRole('group', { name: 'Sans ces étiquettes' });
    expect(within(excluded).getByRole('checkbox', { name: 'lunaire (demandée)' })).toBeDisabled();
    expect(screen.getByText('1 choisie')).toBeInTheDocument();
  });

  it('should tell a tag no longer in the list and keep the other criteria without it', async () => {
    const vrille = tagNamed('vrille');
    const lunaire = tagNamed('lunaire');
    const flowGeneration = new FakeFlowGenerationGateway(
      fail({ kind: 'tags-not-in-list', tagIds: [vrille.id] }),
    );
    renderSite(
      `${generator}?transitions=1&base=beginner&flyer=beginner&avec=${lunaire.id}&avec=${vrille.id}`,
      {
        tags: new FakeTagListGateway(ok(seededTags)),
        flowGeneration,
      },
    );
    await generate();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "L'étiquette « vrille » n'est plus disponible. Vérifie tes étiquettes, puis génère de nouveau ton flow.",
    );
    const requested = screen.getByRole('group', { name: "Avec l'une de ces étiquettes" });
    expect(within(requested).getByRole('checkbox', { name: 'lunaire' })).toBeChecked();
    expect(within(requested).queryByRole('checkbox', { name: 'vrille' })).not.toBeInTheDocument();
  });

  it('should let a flow be generated without tags when they could not be loaded', async () => {
    const flowGeneration = new FakeFlowGenerationGateway(ok(throneToLeaf));
    renderSite(generator, { tags: new FakeTagListGateway(fail({ kind: 'unreachable' })), flowGeneration });

    expect(
      await screen.findByText(
        "Les étiquettes n'ont pas pu être chargées : tu peux générer un flow sans étiquette.",
      ),
    ).toBeInTheDocument();
    await generate();
    await waitFor(() => expect(flowGeneration.sent).toHaveLength(1));
  });
});
