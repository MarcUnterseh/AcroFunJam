import { describe, expect, it } from 'vitest';
import { fail, ok } from '../../domain/common/result';
import { defaultFlowCriteria } from '../../domain/flow-generation/flow-criteria';
import type { GeneratedFlow } from '../../domain/flow-generation/generated-flow';
import { noShownFlow, showDrawn, type ShownFlow } from '../../domain/flow-generation/shown-flow';
import type { FlowGenerationFailure, FlowGenerationGateway } from './FlowGenerationGateway';
import type { LastShownFlowStore } from './LastShownFlowStore';
import { drawFlow, lastShownFlow, showPreviousFlow } from './shown-flow-use-cases';

// Story 9b, M3: the flow shown and its criteria are kept on the device; M6: a failed draw keeps the flow shown.

const flow = (transitionId: string): GeneratedFlow => ({
  start: { id: 'throne', name: 'Throne', baseDifficulty: 'beginner', flyerDifficulty: 'beginner', tags: [] },
  steps: [
    {
      number: 1,
      transition: {
        id: transitionId,
        name: null,
        baseDifficulty: 'beginner',
        flyerDifficulty: 'beginner',
        description: 'Un élan.',
        tags: [],
      },
      isWashingMachine: false,
      arrival: {
        id: 'bird',
        name: 'Bird',
        baseDifficulty: 'beginner',
        flyerDifficulty: 'beginner',
        tags: [],
      },
    },
  ],
});

const shown = (transitionId: string): ShownFlow => ({
  flow: flow(transitionId),
  criteria: defaultFlowCriteria,
});

class MemoryStore implements LastShownFlowStore {
  kept: ShownFlow[] = [];
  constructor(
    private readonly stored: ShownFlow | null = null,
    private readonly broken = false,
  ) {}
  load = async () => {
    if (this.broken) throw new Error('storage unavailable');
    return this.stored;
  };
  keep = async (flowShown: ShownFlow) => {
    if (this.broken) throw new Error('storage unavailable');
    this.kept.push(flowShown);
  };
}

const answering = (
  answer: Awaited<ReturnType<FlowGenerationGateway['generateFlow']>>,
): FlowGenerationGateway => ({
  generateFlow: async () => answer,
});

describe('lastShownFlow', () => {
  it('should give the flow kept on the device', async () => {
    expect(await lastShownFlow(new MemoryStore(shown('t1')))).toEqual(shown('t1'));
  });

  it('should give no flow when none is kept or the device cannot read it', async () => {
    expect(await lastShownFlow(new MemoryStore())).toBeNull();
    expect(await lastShownFlow(new MemoryStore(shown('t1'), true))).toBeNull();
  });
});

describe('drawFlow', () => {
  it('should show the flow drawn, keep it on the device, and offer the one it replaced', async () => {
    const store = new MemoryStore();

    const drawn = await drawFlow(
      answering(ok(flow('t2'))),
      store,
      showDrawn(noShownFlow, shown('t1')),
      defaultFlowCriteria,
    );

    expect(drawn).toEqual({
      state: { shown: shown('t2'), previous: shown('t1') },
      failure: null,
      sameAsShown: false,
    });
    expect(store.kept).toEqual([shown('t2')]);
  });

  it('should tell when the same flow came out, without offering it as the previous one', async () => {
    const drawn = await drawFlow(
      answering(ok(flow('t1'))),
      new MemoryStore(),
      showDrawn(noShownFlow, shown('t1')),
      defaultFlowCriteria,
    );

    expect(drawn.sameAsShown).toBe(true);
    expect(drawn.state.previous).toBeNull();
  });

  it('should keep the flow shown, forget the previous one and write nothing when the draw fails', async () => {
    const failure: FlowGenerationFailure = { kind: 'unreachable' };
    const store = new MemoryStore();
    const before = showDrawn(showDrawn(noShownFlow, shown('t1')), shown('t2'));

    const drawn = await drawFlow(answering(fail(failure)), store, before, defaultFlowCriteria);

    expect(drawn).toEqual({ state: { shown: shown('t2'), previous: null }, failure, sameAsShown: false });
    expect(store.kept).toEqual([]);
  });

  it('should show the flow even when the device cannot keep it', async () => {
    const drawn = await drawFlow(
      answering(ok(flow('t1'))),
      new MemoryStore(null, true),
      noShownFlow,
      defaultFlowCriteria,
    );

    expect(drawn.state.shown).toEqual(shown('t1'));
  });
});

describe('showPreviousFlow', () => {
  it('should show the previous flow again and keep it on the device as the flow shown (M3, M9)', async () => {
    const store = new MemoryStore();
    const replaced = showDrawn(showDrawn(noShownFlow, shown('t1')), shown('t2'));

    expect(await showPreviousFlow(store, replaced)).toEqual({ shown: shown('t1'), previous: null });
    expect(store.kept).toEqual([shown('t1')]);
  });

  it('should change nothing and keep nothing when there is no previous flow', async () => {
    const store = new MemoryStore();
    const state = showDrawn(noShownFlow, shown('t1'));

    expect(await showPreviousFlow(store, state)).toBe(state);
    expect(store.kept).toEqual([]);
  });

  it('should show the previous flow even when the device cannot keep it', async () => {
    const replaced = showDrawn(showDrawn(noShownFlow, shown('t1')), shown('t2'));

    expect((await showPreviousFlow(new MemoryStore(null, true), replaced)).shown).toEqual(shown('t1'));
  });
});
