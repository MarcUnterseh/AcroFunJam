import type { ShownFlow } from '../../domain/flow-generation/shown-flow';

/**
 * Port: the last flow shown and its criteria, kept on the device (story 9b, M3, ADR 0038), readable offline, descriptions
 * included. Implemented by the application (device storage); the previous flow (M9) is never kept.
 */
export interface LastShownFlowStore {
  /** The flow kept, or null when none is (or it cannot be read any more). */
  load(): Promise<ShownFlow | null>;
  keep(shown: ShownFlow): Promise<void>;
}
