import type { LastShownFlowStore, ShownFlow } from '@acrofunjam/core';

/** The key-value storage of the device (expo-sqlite/kv-store), as the adapter needs it. */
export type KeyValueStorage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
};

export const lastShownFlowKey = 'flow-generation.last-shown-flow';

const version = 1;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

/** Enough to show it: a start pose, steps, and criteria with a length; anything else is « no flow kept ». */
const readShownFlow = (raw: string): ShownFlow | null => {
  try {
    const kept: unknown = JSON.parse(raw);
    if (!isRecord(kept) || kept['version'] !== version) return null;
    const { flow, criteria } = kept;
    return isRecord(flow) &&
      isRecord(flow['start']) &&
      Array.isArray(flow['steps']) &&
      flow['steps'].length > 0 &&
      isRecord(criteria) &&
      typeof criteria['length'] === 'number'
      ? ({ flow, criteria } as ShownFlow)
      : null;
  } catch {
    return null;
  }
};

/**
 * Adapter of the LastShownFlowStore port of @acrofunjam/core (story 9b, M3, ADR 0038): one key, versioned JSON, the
 * descriptions included so that the flow can be read offline.
 */
export const createKvLastShownFlowStore = (storage: KeyValueStorage): LastShownFlowStore => ({
  async load() {
    const raw = await storage.getItem(lastShownFlowKey);
    return raw === null ? null : readShownFlow(raw);
  },
  async keep({ flow, criteria }) {
    await storage.setItem(lastShownFlowKey, JSON.stringify({ version, flow, criteria }));
  },
});
