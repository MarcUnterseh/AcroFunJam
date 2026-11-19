import { ok, type Result } from '../../domain/common/result';
import type { FlowCriteria } from '../../domain/flow-generation/flow-criteria';
import { sameFlow, type GeneratedFlow } from '../../domain/flow-generation/generated-flow';
import type { FlowGenerationFailure, FlowGenerationGateway } from './FlowGenerationGateway';

// Story 9 « Générer un flow »: anyone, visitor included, draws a flow in the published catalog (ADR 0037).

/** Draws a flow with these criteria. */
export const generateFlow = (
  gateway: FlowGenerationGateway,
  criteria: FlowCriteria,
): Promise<Result<GeneratedFlow, FlowGenerationFailure>> => gateway.generateFlow(criteria);

/** Another flow, and whether it is the one shown (the catalog then offers little choice, Q196). */
export type AnotherFlow = { readonly flow: GeneratedFlow; readonly sameAsShown: boolean };

/** « Générer un autre flow »: the criteria of the flow shown, drawn again; the same flow may come out. */
export const generateAnotherFlow = async (
  gateway: FlowGenerationGateway,
  criteria: FlowCriteria,
  shown: GeneratedFlow,
): Promise<Result<AnotherFlow, FlowGenerationFailure>> => {
  const drawn = await gateway.generateFlow(criteria);
  return drawn.ok ? ok({ flow: drawn.value, sameAsShown: sameFlow(drawn.value, shown) }) : drawn;
};
