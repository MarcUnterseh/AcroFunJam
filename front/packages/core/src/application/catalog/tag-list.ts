import { checkTagContent, type Tag, type TagFieldError, type TagInput } from '../../domain/catalog/tag';
import { fail, type Result } from '../../domain/common/result';
import type {
  TagAccessFailure,
  TagChangeFailure,
  TagListFailure,
  TagListGateway,
  TagRemovalFailure,
} from './TagListGateway';

// Story 8 « Étiquettes », part 1: the list of tags, consulted by anybody, managed by the validators and the
// administrators (ADR 0032, ADR 0034).

/** Why a change of the list was not recorded, whatever the tag: what the site tells the person. */
export type TagAccessError =
  /** Visitor, expired session or deleted account: sign in again (ADR 0018). */
  | { readonly kind: 'session-expired' }
  /** Still signed in, but no longer a validator nor an administrator. */
  | { readonly kind: 'role-withdrawn' }
  | { readonly kind: 'unreachable' }
  | { readonly kind: 'outdated' };

export type TagEditError =
  | TagAccessError
  | { readonly kind: 'invalid-input'; readonly errors: readonly TagFieldError[] }
  | { readonly kind: 'name-taken' }
  | { readonly kind: 'not-found' };

export type TagRemovalError = TagAccessError | Exclude<TagRemovalFailure, TagAccessFailure>;

/** What the site tells of a refusal whatever the tag (also when tagging a transition). */
export const tagAccessError = (failure: TagAccessFailure): TagAccessError => {
  switch (failure.kind) {
    case 'unauthenticated':
      return { kind: 'session-expired' };
    case 'forbidden':
      return { kind: 'role-withdrawn' };
    default:
      return failure;
  }
};

const isAccessFailure = (failure: { readonly kind: string }): failure is TagAccessFailure =>
  ['unauthenticated', 'forbidden', 'unreachable', 'outdated'].includes(failure.kind);

const translated = <E extends { readonly kind: string }>(failure: E | TagAccessFailure) =>
  isAccessFailure(failure) ? tagAccessError(failure) : (failure as Exclude<E, TagAccessFailure>);

/** The tags of the list, in catalog order. */
export const listTags = (gateway: TagListGateway): Promise<Result<readonly Tag[], TagListFailure>> =>
  gateway.listTags();

const edited = async (
  input: TagInput,
  send: (content: { name: string; description: string }) => ReturnType<TagListGateway['addTag']>,
): Promise<Result<Tag, TagEditError>> => {
  const content = checkTagContent(input);
  if (!content.ok) return fail({ kind: 'invalid-input', errors: content.error });
  const answer = await send(content.value);
  return answer.ok ? answer : fail(translated<TagChangeFailure>(answer.error));
};

/** Adds a tag, its content checked first (no request if invalid). */
export const addTag = (gateway: TagListGateway, input: TagInput): Promise<Result<Tag, TagEditError>> =>
  edited(input, (content) => gateway.addTag(content));

/** Renames a tag and changes its description, both sent (the unchanged one as it is), checked first. */
export const changeTag = (
  gateway: TagListGateway,
  id: string,
  input: TagInput,
): Promise<Result<Tag, TagEditError>> => edited(input, (content) => gateway.changeTag(id, content));

/** Takes a tag out of the list; refused with its carriers, or with the tags implying it. */
export const removeTag = async (
  gateway: TagListGateway,
  id: string,
): Promise<Result<void, TagRemovalError>> => {
  const answer = await gateway.removeTag(id);
  return answer.ok ? answer : fail(translated<TagRemovalFailure>(answer.error));
};
