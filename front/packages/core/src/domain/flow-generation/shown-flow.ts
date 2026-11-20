import type { FlowCriteria } from './flow-criteria';
import { sameFlow, type GeneratedFlow } from './generated-flow';

/** A flow shown, with the criteria it was drawn with (story 9b, glossary « Flow affiché »). */
export type ShownFlow = { readonly flow: GeneratedFlow; readonly criteria: FlowCriteria };

/**
 * The flow shown and, after a new draw replaced it, the one before (M9 « Revenir au flow précédent »): only one previous
 * flow, none when the same flow came out again, none once it was shown again.
 */
export type ShownFlowState = { readonly shown: ShownFlow | null; readonly previous: ShownFlow | null };

export const noShownFlow: ShownFlowState = { shown: null, previous: null };

/** A new draw is shown: the flow it replaces becomes the previous one, unless it is the same flow. */
export const showDrawn = (state: ShownFlowState, drawn: ShownFlow): ShownFlowState => ({
  shown: drawn,
  previous: state.shown && !sameFlow(state.shown.flow, drawn.flow) ? state.shown : null,
});

export const canShowPrevious = (state: ShownFlowState): boolean => state.previous !== null;

/** « Revenir au flow précédent »: the previous flow and its criteria are shown again; no other is offered then. */
export const showPrevious = (state: ShownFlowState): ShownFlowState =>
  state.previous ? { shown: state.previous, previous: null } : state;

/** The offer goes: « Modifier les critères », a failed draw, or the short-lived message is over. */
export const forgetPrevious = (state: ShownFlowState): ShownFlowState =>
  state.previous ? { ...state, previous: null } : state;
