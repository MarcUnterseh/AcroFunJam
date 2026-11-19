import {
  fail,
  ok,
  type FlowGenerationFailure,
  type FlowGenerationGateway,
  type FlowPose,
  type FlowStep,
  type FlowTransition,
  type GeneratedFlow,
  type Result,
} from '@acrofunjam/core';
import type { ApiClient } from '../client';
import { isDifficultyCode } from '../shared-kernel/difficulty-codes';
import { everyItem, tagIdsOf, toTagList } from '../shared-kernel/tag-reading';

// The generated types describe the contract, but the server may evolve before the client is regenerated: every value
// is checked, and a flow that cannot be read is an outdated site.

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;
const isString = (value: unknown): value is string => typeof value === 'string';
const isNullableString = (value: unknown): value is string | null => value === null || isString(value);

const toPose = (value: unknown): FlowPose | null => {
  if (!isRecord(value)) return null;
  const { id, name, baseDifficulty, flyerDifficulty } = value;
  const tags = toTagList(value['tags']);
  return isString(id) &&
    isString(name) &&
    isDifficultyCode(baseDifficulty) &&
    isDifficultyCode(flyerDifficulty) &&
    tags
    ? { id, name, baseDifficulty, flyerDifficulty, tags }
    : null;
};

const toTransition = (value: unknown): FlowTransition | null => {
  if (!isRecord(value)) return null;
  const { id, name, baseDifficulty, flyerDifficulty, description } = value;
  const tags = toTagList(value['tags']);
  return isString(id) &&
    isNullableString(name) &&
    isDifficultyCode(baseDifficulty) &&
    isDifficultyCode(flyerDifficulty) &&
    isNullableString(description) &&
    tags
    ? { id, name, baseDifficulty, flyerDifficulty, description, tags }
    : null;
};

const toStep = (value: unknown): FlowStep | null => {
  if (!isRecord(value)) return null;
  const { number, isWashingMachine } = value;
  const transition = toTransition(value['transition']);
  const arrival = toPose(value['arrival']);
  return typeof number === 'number' && typeof isWashingMachine === 'boolean' && transition && arrival
    ? { number, transition, isWashingMachine, arrival }
    : null;
};

const toFlow = (value: unknown): GeneratedFlow | null => {
  if (!isRecord(value)) return null;
  const start = toPose(value['start']);
  const steps = everyItem(value['steps'], toStep);
  return start && steps && steps.length > 0 ? { start, steps } : null;
};

/** The business code of a ProblemDetails is its title (ADR 0007). */
const codeOf = (problem: unknown): string =>
  isRecord(problem) && isString(problem['title']) ? problem['title'] : '';

const failureOf = (status: number, problem: unknown): FlowGenerationFailure => {
  if (status >= 500) return { kind: 'unreachable' };
  const code = codeOf(problem);
  if (status === 422 && code === 'flow-generation.criteria-too-restrictive')
    return { kind: 'criteria-too-restrictive' };
  if (status === 422 && code === 'flow-generation.catalog-insufficient')
    return { kind: 'catalog-insufficient' };
  if (status === 409 && code === 'flow-generation.tag-not-in-list')
    return { kind: 'tags-not-in-list', tagIds: tagIdsOf(problem) };
  // The site always sends valid criteria: any other refusal means the API is newer than the site.
  return { kind: 'outdated' };
};

/** HTTP adapter of the FlowGenerationGateway port of @acrofunjam/core (story 9, ADR 0037). */
export const createFlowGenerationGateway = (client: ApiClient): FlowGenerationGateway => ({
  async generateFlow(criteria): Promise<Result<GeneratedFlow, FlowGenerationFailure>> {
    try {
      const { data, error, response } = await client.POST('/flow-generation/flows', {
        body: {
          length: criteria.length,
          baseDifficultyCeiling: criteria.baseCeiling,
          flyerDifficultyCeiling: criteria.flyerCeiling,
          requestedTagIds: [...criteria.requestedTagIds],
          excludedTagIds: [...criteria.excludedTagIds],
        },
      });
      if (!response.ok) return fail(failureOf(response.status, error));
      const flow = toFlow(data);
      return flow ? ok(flow) : fail({ kind: 'outdated' });
    } catch {
      // A request that cannot reach the API (network down, server gone).
      return fail({ kind: 'unreachable' });
    }
  },
});
