import { describe, expect, it } from 'vitest';
import { defaultFlowCriteria, type FlowCriteria } from './flow-criteria';
import type { GeneratedFlow } from './generated-flow';
import {
  canShowPrevious,
  forgetPrevious,
  noShownFlow,
  showDrawn,
  showPrevious,
  type ShownFlow,
  type ShownFlowState,
} from './shown-flow';

// Story 9b « Générer un flow sur mobile », M9: « Revenir au flow précédent » after a new draw replaced the flow shown.

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
        description: null,
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

const shown = (transitionId: string, criteria: Partial<FlowCriteria> = {}): ShownFlow => ({
  flow: flow(transitionId),
  criteria: { ...defaultFlowCriteria, ...criteria },
});

describe('shown flow', () => {
  it('should offer no previous flow when the first flow is shown', () => {
    const state = showDrawn(noShownFlow, shown('t1'));

    expect(state).toEqual({ shown: shown('t1'), previous: null });
    expect(canShowPrevious(state)).toBe(false);
  });

  it('should keep the flow it replaces, with its criteria, as the previous one', () => {
    const state = showDrawn(showDrawn(noShownFlow, shown('t1', { length: 2 })), shown('t2'));

    expect(state.previous).toEqual(shown('t1', { length: 2 }));
    expect(canShowPrevious(state)).toBe(true);
  });

  it('should offer no previous flow when the same flow came out again', () => {
    const state = showDrawn(showDrawn(noShownFlow, shown('t1')), shown('t1'));

    expect(canShowPrevious(state)).toBe(false);
  });

  it('should keep only one previous flow, the last one replaced', () => {
    const state = showDrawn(showDrawn(showDrawn(noShownFlow, shown('t1')), shown('t2')), shown('t3'));

    expect(state.previous).toEqual(shown('t2'));
  });

  it('should show the previous flow and its criteria again, then offer none', () => {
    const replaced = showDrawn(showDrawn(noShownFlow, shown('t1', { length: 2 })), shown('t2'));

    const restored = showPrevious(replaced);

    expect(restored).toEqual({ shown: shown('t1', { length: 2 }), previous: null });
    expect(canShowPrevious(restored)).toBe(false);
  });

  it('should change nothing when there is no previous flow to show', () => {
    const state: ShownFlowState = showDrawn(noShownFlow, shown('t1'));

    expect(showPrevious(state)).toBe(state);
  });

  it('should forget the previous flow and keep the flow shown', () => {
    const state = forgetPrevious(showDrawn(showDrawn(noShownFlow, shown('t1')), shown('t2')));

    expect(state).toEqual({ shown: shown('t2'), previous: null });
  });
});
