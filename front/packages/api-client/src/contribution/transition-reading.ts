import type {
  TransitionAdjustment,
  TransitionContent,
  TransitionDescription,
  TransitionName,
  TransitionPose,
} from '@acrofunjam/core';
import { isDifficultyCode } from '../shared-kernel/difficulty-codes';

// Reading the transitions of the Contribution API (story 7, ADR 0030). The generated types describe the contract, but
// the server may evolve before the client is regenerated: every value is checked, null when it cannot be read.

const isString = (value: unknown): value is string => typeof value === 'string';
const isOptionalString = (value: unknown): value is string | null => value === null || isString(value);
export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

/** A pose a transition designates, under its current name. */
export const toTransitionPose = (value: unknown): TransitionPose | null =>
  isRecord(value) && isString(value['id']) && isString(value['name'])
    ? { id: value['id'], name: value['name'] }
    : null;

/** The transition carried by an item (proposed, or retained once accepted): name and description normalised by the API. */
export const toTransitionContent = (item: Record<string, unknown>): TransitionContent | null => {
  const { name, baseDifficulty, flyerDifficulty, description } = item;
  if (
    !isOptionalString(name) ||
    !isDifficultyCode(baseDifficulty) ||
    !isDifficultyCode(flyerDifficulty) ||
    !isOptionalString(description)
  )
    return null;
  return {
    name: name as TransitionName | null,
    baseDifficulty,
    flyerDifficulty,
    description: description as TransitionDescription | null,
  };
};

type Change<T> = { readonly proposed: T; readonly retained: T };

/** An adjusted field, null when absent (not adjusted), undefined when it cannot be read. */
const change = <T>(value: unknown, isValue: (v: unknown) => v is T): Change<T> | null | undefined => {
  if (value === null) return null;
  if (!isRecord(value)) return undefined;
  const { proposed, retained } = value;
  return isValue(proposed) && isValue(retained) ? { proposed, retained } : undefined;
};

/**
 * The adjusted fields of a transition, in the order of the form (a removed name or description is null on its side);
 * undefined when they cannot be read, or when there is none.
 */
export const toTransitionAdjustments = (adjustments: unknown): TransitionAdjustment[] | undefined => {
  if (!isRecord(adjustments)) return undefined;
  const name = change(adjustments['name'], isOptionalString);
  const base = change(adjustments['baseDifficulty'], isDifficultyCode);
  const flyer = change(adjustments['flyerDifficulty'], isDifficultyCode);
  const description = change(adjustments['description'], isOptionalString);
  if ([name, base, flyer, description].includes(undefined)) return undefined;
  const read: TransitionAdjustment[] = [];
  if (name)
    read.push({
      field: 'name',
      proposed: name.proposed as TransitionName | null,
      retained: name.retained as TransitionName | null,
    });
  if (base) read.push({ field: 'baseDifficulty', ...base });
  if (flyer) read.push({ field: 'flyerDifficulty', ...flyer });
  if (description)
    read.push({
      field: 'description',
      proposed: description.proposed as TransitionDescription | null,
      retained: description.retained as TransitionDescription | null,
    });
  return read.length > 0 ? read : undefined;
};

/** The place of a transition is taken between its poses (ADR 0029), by business code. */
export const transitionPlaceRefusals = {
  'contribution.transition-name-already-in-catalog': { kind: 'transition-name-already-in-catalog' },
  'contribution.transition-name-already-pending': { kind: 'transition-name-already-pending' },
  'contribution.unnamed-transition-already-in-catalog': { kind: 'unnamed-transition-already-in-catalog' },
  'contribution.unnamed-transition-already-pending': { kind: 'unnamed-transition-already-pending' },
} as const;
