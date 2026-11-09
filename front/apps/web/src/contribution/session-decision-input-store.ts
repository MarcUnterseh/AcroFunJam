import type { DecisionInputStore, KeptDecision, KeptDecisionInputs } from '@acrofunjam/core';
import { attempt, isRecord, parseProposalInput } from './kept-input-parsing';

const key = 'afj-decision-inputs';

const parseDecision = (value: unknown): KeptDecision | null => {
  if (!isRecord(value)) return null;
  if (value['kind'] === 'rejection' && typeof value['reason'] === 'string')
    return { kind: 'rejection', reason: value['reason'] };
  if (value['kind'] !== 'acceptance' || typeof value['note'] !== 'string') return null;
  const input = parseProposalInput(value['input']);
  return input && { kind: 'acceptance', input, note: value['note'] };
};

/** What was stored may come from an older version of the site: anything unexpected is ignored. */
const parse = (raw: string | null): KeptDecisionInputs | null => {
  if (raw === null) return null;
  const value: unknown = attempt(() => JSON.parse(raw), null);
  if (!isRecord(value) || typeof value['owner'] !== 'string' || !isRecord(value['decisions'])) return null;
  const decisions = Object.entries(value['decisions']).flatMap(([id, decision]) => {
    const parsed = parseDecision(decision);
    return parsed ? [[id, parsed] as const] : [];
  });
  return { owner: value['owner'], decisions: Object.fromEntries(decisions) };
};

/**
 * DecisionInputStore on sessionStorage (ADR 0019): the input of the decisions stays in this tab, and
 * disappears with it. Stored with its owner, the address of the session; not a decision (glossary « Saisie
 * conservée »).
 */
export const createSessionDecisionInputStore = (storage: Storage): DecisionInputStore => ({
  load: () => parse(attempt(() => storage.getItem(key), null)),
  save: (kept) => attempt(() => storage.setItem(key, JSON.stringify(kept)), undefined),
  clear: () => attempt(() => storage.removeItem(key), undefined),
});
