import type { FlowCriteria } from '../../domain/flow-generation/flow-criteria';
import {
  forgetPrevious,
  showDrawn,
  showPrevious,
  type ShownFlow,
  type ShownFlowState,
} from '../../domain/flow-generation/shown-flow';
import { sameFlow } from '../../domain/flow-generation/generated-flow';
import type { FlowGenerationFailure, FlowGenerationGateway } from './FlowGenerationGateway';
import type { LastShownFlowStore } from './LastShownFlowStore';

// Story 9b « Générer un flow sur mobile » (ADR 0038): the flow shown is kept on the device, a new draw may be undone.

/** The flow kept on the device, shown when the application opens (M1, M3); none if it cannot be read. */
export const lastShownFlow = async (store: LastShownFlowStore): Promise<ShownFlow | null> => {
  try {
    return await store.load();
  } catch {
    return null;
  }
};

/** What a draw leaves: the state to show, why no flow came (null when one did), and whether the same flow came out. */
export type DrawnFlow = {
  readonly state: ShownFlowState;
  readonly failure: FlowGenerationFailure | null;
  readonly sameAsShown: boolean;
};

/**
 * Draws a flow with these criteria (« Générer un flow », « Générer un autre flow »): shown and kept on the device, the one
 * it replaces offered as the previous one (M9). A failed draw keeps the flow shown, forgets the previous one and writes
 * nothing (M6); a device that cannot keep the flow does not prevent it from being shown.
 */
export const drawFlow = async (
  gateway: FlowGenerationGateway,
  store: LastShownFlowStore,
  state: ShownFlowState,
  criteria: FlowCriteria,
): Promise<DrawnFlow> => {
  const drawn = await gateway.generateFlow(criteria);
  if (!drawn.ok) return { state: forgetPrevious(state), failure: drawn.error, sameAsShown: false };
  const shown: ShownFlow = { flow: drawn.value, criteria };
  try {
    await store.keep(shown);
  } catch {
    // Kept at best: the flow is shown all the same.
  }
  return {
    state: showDrawn(state, shown),
    failure: null,
    sameAsShown: state.shown !== null && sameFlow(state.shown.flow, drawn.value),
  };
};

/**
 * « Revenir au flow précédent » (M9): the previous flow and its criteria are shown again, and kept on the device as the
 * flow shown (M3); a device that cannot keep it does not prevent it from being shown.
 */
export const showPreviousFlow = async (store: LastShownFlowStore, state: ShownFlowState): Promise<ShownFlowState> => {
  if (!state.previous) return state;
  const restored = showPrevious(state);
  try {
    if (restored.shown) await store.keep(restored.shown);
  } catch {
    // Kept at best: the flow is shown all the same.
  }
  return restored;
};
