import type { Result } from '../../domain/common/result';
import type { FlowCriteria } from '../../domain/flow-generation/flow-criteria';
import type { GeneratedFlow } from '../../domain/flow-generation/generated-flow';

/** Why no flow was drawn (ADR 0037). */
export type FlowGenerationFailure =
  /** No flow matches the criteria, while the catalog allows some without them. */
  | { readonly kind: 'criteria-too-restrictive' }
  /** No flow of 1 to 10 transitions exists in the catalog yet, whatever the criteria. */
  | { readonly kind: 'catalog-insufficient' }
  /** Chosen tags left the list of tags meanwhile (K8). */
  | { readonly kind: 'tags-not-in-list'; readonly tagIds: readonly string[] }
  /** AcroFunJam could not be reached (network down, server gone): the criteria are kept, « Réessayer ». */
  | { readonly kind: 'unreachable' }
  /** A refusal the site does not know (its criteria are always valid): the site must be reloaded. */
  | { readonly kind: 'outdated' };

/** Port: drawing a flow in the published catalog (story 9). Implemented by @acrofunjam/api-client. */
export interface FlowGenerationGateway {
  generateFlow(criteria: FlowCriteria): Promise<Result<GeneratedFlow, FlowGenerationFailure>>;
}
