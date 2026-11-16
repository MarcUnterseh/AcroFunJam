import {
  fail,
  ok,
  type NamedTag,
  type Result,
  type Tag,
  type TagCarrier,
  type TagChangeFailure,
  type TagListFailure,
  type TagListGateway,
  type TagRemovalFailure,
  type ValidTagContent,
} from '@acrofunjam/core';
import type { ApiClient } from '../client';
import type { components } from '../generated/schema';

type TagRequest = components['schemas']['TagRequest'];

// The generated types describe the contract, but the server may evolve before the client is regenerated: every value
// is checked, null when it cannot be read (the site is then outdated).

const isString = (value: unknown): value is string => typeof value === 'string';
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

/** The business code of a ProblemDetails is its title (ADR 0007). */
const codeOf = (problem: unknown): string =>
  isRecord(problem) && isString(problem['title']) ? problem['title'] : '';

const toTag = (value: unknown): Tag | null => {
  if (!isRecord(value)) return null;
  const { id, name, description, impliedTagId, transitionCount } = value;
  if (
    !isString(id) ||
    !isString(name) ||
    !isString(description) ||
    !(impliedTagId === null || isString(impliedTagId)) ||
    typeof transitionCount !== 'number'
  )
    return null;
  return { id, name, description, impliedTagId, transitionCount };
};

const toNamed = (value: unknown): NamedTag | null =>
  isRecord(value) && isString(value['id']) && isString(value['name'])
    ? { id: value['id'], name: value['name'] }
    : null;

const toCarrier = (value: unknown): TagCarrier | null => {
  if (!isRecord(value)) return null;
  const fromPose = toNamed(value['fromPose']);
  const toPose = toNamed(value['toPose']);
  const { id, name } = value;
  if (!isString(id) || !fromPose || !toPose || !(name === null || isString(name))) return null;
  return { id, fromPose, toPose, name };
};

/** Every item read, or null when one cannot be. */
const all = <T>(value: unknown, read: (item: unknown) => T | null): T[] | null => {
  if (!Array.isArray(value)) return null;
  const items = value.map(read);
  return items.every((item) => item !== null) ? (items as T[]) : null;
};

/** 401: visitor, expired session or deleted account (ADR 0018); 403: a role without « gérer les étiquettes ». */
const accessFailureOf = (status: number): TagChangeFailure | null => {
  if (status === 401) return { kind: 'unauthenticated' };
  if (status === 403) return { kind: 'forbidden' };
  if (status >= 500) return { kind: 'unreachable' };
  return null;
};

const changeFailureOf = (status: number, problem: unknown): TagChangeFailure => {
  const access = accessFailureOf(status);
  if (access) return access;
  const code = codeOf(problem);
  if (status === 409 && code === 'catalog.tag-name-taken') return { kind: 'name-taken' };
  if (status === 404 && code === 'catalog.tag-not-found') return { kind: 'not-found' };
  // The content rules (400) are checked by the site before sending: refused anyway, the site is outdated.
  return { kind: 'outdated' };
};

const removalFailureOf = (status: number, problem: unknown): TagRemovalFailure => {
  const access = accessFailureOf(status);
  if (access) return access as TagRemovalFailure;
  const code = codeOf(problem);
  if (status === 404 && code === 'catalog.tag-not-found') return { kind: 'not-found' };
  if (status === 409 && code === 'catalog.tag-carried' && isRecord(problem)) {
    const transitions = all(problem['transitions'], toCarrier);
    const pendingProposals = all(problem['pendingProposals'] ?? [], toCarrier);
    if (transitions && pendingProposals) return { kind: 'carried', transitions, pendingProposals };
  }
  if (status === 409 && code === 'catalog.tag-implied' && isRecord(problem)) {
    const impliedBy = all(problem['impliedBy'], toNamed);
    if (impliedBy) return { kind: 'implied', impliedBy };
  }
  return { kind: 'outdated' };
};

// The request is written field by field: the contract is the generated schema, not the client domain.
const toRequest = (content: ValidTagContent): TagRequest => ({
  name: content.name,
  description: content.description,
});

/** A request that cannot reach the API (network down, server gone) is reported as such, whatever the call. */
const unlessUnreachable = async <T, E>(
  call: () => Promise<Result<T, E>>,
): Promise<Result<T, E | { readonly kind: 'unreachable' }>> => {
  try {
    return await call();
  } catch {
    return fail({ kind: 'unreachable' });
  }
};

/** HTTP adapter of the TagListGateway port of @acrofunjam/core (story 8, ADR 0034). */
export const createTagListGateway = (client: ApiClient): TagListGateway => ({
  listTags: () =>
    unlessUnreachable<readonly Tag[], TagListFailure>(async () => {
      const { data, response } = await client.GET('/catalog/tags');
      if (!response.ok) return fail(response.status >= 500 ? { kind: 'unreachable' } : { kind: 'outdated' });
      const tags = isRecord(data) ? all(data['tags'], toTag) : null;
      return tags ? ok(tags) : fail({ kind: 'outdated' });
    }),

  addTag: (content) =>
    unlessUnreachable<Tag, TagChangeFailure>(async () => {
      const { data, error, response } = await client.POST('/catalog/tags', { body: toRequest(content) });
      if (!response.ok) return fail(changeFailureOf(response.status, error));
      const tag = toTag(data);
      return tag ? ok(tag) : fail({ kind: 'outdated' });
    }),

  changeTag: (id, content) =>
    unlessUnreachable<Tag, TagChangeFailure>(async () => {
      const { data, error, response } = await client.PUT('/catalog/tags/{id}', {
        params: { path: { id } },
        body: toRequest(content),
      });
      if (!response.ok) return fail(changeFailureOf(response.status, error));
      const tag = toTag(data);
      return tag ? ok(tag) : fail({ kind: 'outdated' });
    }),

  removeTag: (id) =>
    unlessUnreachable<void, TagRemovalFailure>(async () => {
      const { error, response } = await client.DELETE('/catalog/tags/{id}', { params: { path: { id } } });
      return response.ok ? ok(undefined) : fail(removalFailureOf(response.status, error));
    }),
});
