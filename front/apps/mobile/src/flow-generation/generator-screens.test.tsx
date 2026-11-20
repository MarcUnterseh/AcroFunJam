import {
  fail,
  ok,
  type FlowCriteria,
  type FlowGenerationFailure,
  type GeneratedFlow,
  type LastShownFlowStore,
  type Result,
  type ShownFlow,
  type Tag,
  type TagListGateway,
} from '@acrofunjam/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { AccessibilityInfo } from 'react-native';
import { CriteriaScreen } from './CriteriaScreen';
import { FlowScreen } from './FlowScreen';
import { GeneratorProvider } from './GeneratorContext';

// Story 9b « Générer un flow sur mobile » (docs/design/ecrans/9b-generer-un-flow-mobile.md, decisions of 2026-11-19).

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const pose = (name: string) => ({
  id: `pose-${name}`,
  name,
  baseDifficulty: 'beginner' as const,
  flyerDifficulty: 'beginner' as const,
  tags: [],
});

const flow = (transition: string | null, arrival = 'Bird', start = 'Throne'): GeneratedFlow => ({
  start: pose(start),
  steps: [
    {
      number: 1,
      transition: {
        id: `t-${transition ?? 'unnamed'}-${arrival}`,
        name: transition,
        baseDifficulty: 'intermediate',
        flyerDifficulty: 'intermediate',
        description: 'La base propulse le flyer depuis Throne, puis le rattrape en Bird.',
        tags: [],
      },
      isWashingMachine: start === arrival,
      arrival: pose(arrival),
    },
  ],
});

const lunaire: Tag = {
  id: 'tag-lunaire',
  name: 'lunaire',
  description: 'Une transition lente et contrôlée.',
  impliedTagId: null,
  scope: 'poses-and-transitions',
  poseCount: 0,
  transitionCount: 0,
};

class FakeFlows {
  readonly sent: FlowCriteria[] = [];
  constructor(private readonly answers: Array<Result<GeneratedFlow, FlowGenerationFailure>>) {}
  generateFlow = async (criteria: FlowCriteria) => {
    this.sent.push(criteria);
    return this.answers.length > 1 ? this.answers.shift()! : this.answers[0]!;
  };
}

class MemoryStore implements LastShownFlowStore {
  constructor(public kept: ShownFlow | null = null) {}
  load = async () => this.kept;
  keep = async (shown: ShownFlow) => {
    this.kept = shown;
  };
}

const tagsAnswering = (answer: Awaited<ReturnType<TagListGateway['listTags']>>) =>
  ({ listTags: async () => answer }) as unknown as TagListGateway;

const renderWith = async (
  ui: ReactNode,
  {
    flows = new FakeFlows([ok(flow('Pop to Bird'))]),
    store = new MemoryStore(),
    tags = tagsAnswering(ok([lunaire])),
  }: { flows?: FakeFlows; store?: MemoryStore; tags?: TagListGateway } = {},
) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  await render(
    <QueryClientProvider client={client}>
      <GeneratorProvider adapters={{ flows, store, tags }}>{ui}</GeneratorProvider>
    </QueryClientProvider>,
  );
  return { flows, store };
};

const press = async (name: string | RegExp) => {
  await act(async () => {
    fireEvent.press(await screen.findByRole('button', { name }));
  });
};

describe('the screen of the criteria', () => {
  it('should preselect 3 transitions and « débutant » for the base and the flyer', async () => {
    await renderWith(<CriteriaScreen onFlow={jest.fn()} />);

    expect(await screen.findByRole('header', { name: 'Générer un flow' })).toBeOnTheScreen();
    expect(screen.getByRole('adjustable', { name: 'Nombre de transitions' })).toHaveAccessibilityValue({
      text: '3 transitions',
    });
    for (const group of ['Difficulté base, au plus', 'Difficulté flyer, au plus'])
      expect(within(screen.getByLabelText(group)).getByRole('radio', { name: 'Débutant' })).toBeChecked();
  });

  it('should count from 1 to 10 transitions with − and +, without drawing a flow', async () => {
    const { flows } = await renderWith(<CriteriaScreen onFlow={jest.fn()} />);

    await press('Diminuer le nombre de transitions');
    await press('Diminuer le nombre de transitions');
    expect(screen.getByRole('adjustable', { name: 'Nombre de transitions' })).toHaveAccessibilityValue({
      text: '1 transition',
    });
    expect(screen.getByRole('button', { name: 'Diminuer le nombre de transitions' })).toBeDisabled();
    expect(flows.sent).toEqual([]);
  });

  it('should draw a flow with the criteria chosen, then show it', async () => {
    const onFlow = jest.fn();
    const { flows, store } = await renderWith(<CriteriaScreen onFlow={onFlow} />);

    await press('Augmenter le nombre de transitions');
    await act(async () => {
      fireEvent.press(
        within(screen.getByLabelText('Difficulté base, au plus')).getByRole('radio', {
          name: 'Avancé',
        }),
      );
    });
    await press('Générer un flow');

    expect(flows.sent).toEqual([
      {
        length: 4,
        baseCeiling: 'advanced',
        flyerCeiling: 'beginner',
        requestedTagIds: [],
        excludedTagIds: [],
      },
    ]);
    expect(onFlow).toHaveBeenCalled();
    expect(store.kept?.criteria.length).toBe(4);
  });

  it('should explain criteria too restrictive with the leads to widen the choice, then let them be changed', async () => {
    await renderWith(<CriteriaScreen onFlow={jest.fn()} />, {
      flows: new FakeFlows([fail({ kind: 'criteria-too-restrictive' })]),
    });
    await press('Générer un flow');

    expect(
      await screen.findByRole('header', {
        name: 'Critères trop restrictifs : impossible de générer un flow.',
      }),
    ).toBeOnTheScreen();
    expect(screen.getByText(/moins de transitions/)).toBeOnTheScreen();
    await press('Modifier les critères');
    expect(screen.getByRole('adjustable', { name: 'Nombre de transitions' })).toBeOnTheScreen();
  });

  it('should tell a catalog that cannot give a flow yet, without a link to the catalog', async () => {
    await renderWith(<CriteriaScreen onFlow={jest.fn()} />, {
      flows: new FakeFlows([fail({ kind: 'catalog-insufficient' })]),
    });
    await press('Générer un flow');

    expect(
      await screen.findByText('Le catalogue ne permet pas encore de générer un flow.'),
    ).toBeOnTheScreen();
    expect(screen.queryByText('Voir le catalogue')).toBeNull();
  });

  it('should tell a generation that could not reach AcroFunJam above the bar, and keep the criteria', async () => {
    await renderWith(<CriteriaScreen onFlow={jest.fn()} />, {
      flows: new FakeFlows([fail({ kind: 'unreachable' })]),
    });
    await press('Générer un flow');

    expect(
      await screen.findByText('Impossible de générer le flow. Vérifie ta connexion Internet, puis réessaie.'),
    ).toBeOnTheScreen();
    expect(screen.getByRole('adjustable', { name: 'Nombre de transitions' })).toHaveAccessibilityValue({
      text: '3 transitions',
    });
  });

  it('should disable a requested tag in the group of the excluded ones, marked « (demandée) »', async () => {
    await renderWith(<CriteriaScreen onFlow={jest.fn()} />);
    await press(/Étiquettes \(facultatives\)/);
    await act(async () => {
      fireEvent.press(
        within(screen.getByLabelText("Avec l'une de ces étiquettes")).getByRole('checkbox', {
          name: 'lunaire',
        }),
      );
    });

    const excluded = within(screen.getByLabelText('Sans ces étiquettes')).getByRole('checkbox', {
      name: 'lunaire (demandée)',
    });
    expect(excluded).toBeDisabled();
  });

  it('should let a flow be drawn without tags when they could not be loaded', async () => {
    await renderWith(<CriteriaScreen onFlow={jest.fn()} />, {
      tags: tagsAnswering(fail({ kind: 'unreachable' })),
    });

    expect(
      await screen.findByText(
        "Les étiquettes n'ont pas pu être chargées : tu peux générer un flow sans étiquette.",
      ),
    ).toBeOnTheScreen();
  });

  it('should open on the flow kept on the device', async () => {
    const onFlow = jest.fn();
    await renderWith(<CriteriaScreen onFlow={onFlow} />, {
      store: new MemoryStore({
        flow: flow('Pop to Bird'),
        criteria: {
          length: 1,
          baseCeiling: 'beginner',
          flyerCeiling: 'beginner',
          requestedTagIds: [],
          excludedTagIds: [],
        },
      }),
    });

    await screen.findByRole('header', { name: 'Générer un flow' });
    expect(onFlow).toHaveBeenCalled();
  });
});

describe('the screen of the flow', () => {
  const kept = (generated: GeneratedFlow): MemoryStore =>
    new MemoryStore({
      flow: generated,
      criteria: {
        length: 1,
        baseCeiling: 'beginner',
        flyerCeiling: 'beginner',
        requestedTagIds: [],
        excludedTagIds: [],
      },
    });

  it('should present the flow: summary, spotter reminder, numbered steps, poses as plain text', async () => {
    await renderWith(<FlowScreen onCriteria={jest.fn()} />, { store: kept(flow(null)) });

    expect(await screen.findByRole('header', { name: 'Ton flow' })).toBeOnTheScreen();
    expect(screen.getByText('1 transition, de Throne à Bird.')).toBeOnTheScreen();
    expect(screen.getByText(/Ce flow est tiré au hasard/)).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'Étape 1 · de Throne vers Bird' })).toBeOnTheScreen();
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('should mark a washing machine and its arrival on the same pose', async () => {
    await renderWith(<FlowScreen onCriteria={jest.fn()} />, {
      store: kept(flow('Ninja Star', 'Star', 'Star')),
    });

    expect(await screen.findByText('washing machine')).toBeOnTheScreen();
    expect(screen.getByText('(même pose)')).toBeOnTheScreen();
  });

  it('should unfold the description of a step', async () => {
    await renderWith(<FlowScreen onCriteria={jest.fn()} />, { store: kept(flow('Pop to Bird')) });
    await press('Description');

    expect(
      screen.getByText('La base propulse le flyer depuis Throne, puis le rattrape en Bird.'),
    ).toBeOnTheScreen();
  });

  it('should offer to come back to the previous flow after another one is drawn', async () => {
    await renderWith(<FlowScreen onCriteria={jest.fn()} />, {
      store: kept(flow('Pop to Bird')),
      flows: new FakeFlows([ok(flow('To Star', 'Star'))]),
    });
    await press('Générer un autre flow');

    expect(await screen.findByText('Nouveau flow généré.')).toBeOnTheScreen();
    await press('Revenir au flow précédent');
    expect(screen.getByRole('header', { name: 'Étape 1 · Pop to Bird' })).toBeOnTheScreen();
    expect(screen.queryByText('Revenir au flow précédent')).toBeNull();
  });

  it('should withdraw the offer to come back to the previous flow after its delay', async () => {
    jest.useFakeTimers();
    await renderWith(<FlowScreen onCriteria={jest.fn()} />, {
      store: kept(flow('Pop to Bird')),
      flows: new FakeFlows([ok(flow('To Star', 'Star'))]),
    });
    await press('Générer un autre flow');
    expect(await screen.findByText('Nouveau flow généré.')).toBeOnTheScreen();

    try {
      await act(async () => {
        jest.advanceTimersByTime(10_000);
      });
    } finally {
      jest.useRealTimers();
    }

    expect(screen.queryByText('Revenir au flow précédent')).toBeNull();
  });

  it('should keep the offer to come back to the previous flow while a screen reader is on (WCAG 2.2.1)', async () => {
    const screenReader = jest.spyOn(AccessibilityInfo, 'isScreenReaderEnabled').mockResolvedValue(true);
    jest.useFakeTimers();
    try {
      await renderWith(<FlowScreen onCriteria={jest.fn()} />, {
        store: kept(flow('Pop to Bird')),
        flows: new FakeFlows([ok(flow('To Star', 'Star'))]),
      });
      await press('Générer un autre flow');
      expect(await screen.findByText('Nouveau flow généré.')).toBeOnTheScreen();

      await act(async () => {
        jest.advanceTimersByTime(60_000);
      });

      expect(screen.getByText('Revenir au flow précédent')).toBeOnTheScreen();
    } finally {
      jest.useRealTimers();
      screenReader.mockRestore();
    }
  });

  it('should tell when the same flow came out, without offering the previous one', async () => {
    await renderWith(<FlowScreen onCriteria={jest.fn()} />, { store: kept(flow('Pop to Bird')) });
    await press('Générer un autre flow');

    expect(
      await screen.findByText(
        'Le même flow est ressorti : avec ces critères, le catalogue offre peu de choix.',
      ),
    ).toBeOnTheScreen();
    expect(screen.queryByText('Revenir au flow précédent')).toBeNull();
  });

  it('should keep the flow shown when AcroFunJam cannot be reached', async () => {
    await renderWith(<FlowScreen onCriteria={jest.fn()} />, {
      store: kept(flow('Pop to Bird')),
      flows: new FakeFlows([fail({ kind: 'unreachable' })]),
    });
    await press('Générer un autre flow');

    expect(
      await screen.findByText('Impossible de générer le flow. Vérifie ta connexion Internet, puis réessaie.'),
    ).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'Étape 1 · Pop to Bird' })).toBeOnTheScreen();
  });

  it('should go back to the criteria of the flow with « Modifier les critères »', async () => {
    const onCriteria = jest.fn();
    await renderWith(<FlowScreen onCriteria={onCriteria} />, { store: kept(flow('Pop to Bird')) });
    await press('Modifier les critères');

    expect(onCriteria).toHaveBeenCalled();
  });
});
