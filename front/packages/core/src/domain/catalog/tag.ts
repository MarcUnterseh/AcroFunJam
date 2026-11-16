import { fail, ok, type Result } from '../common/result';
import { normalizePoseName } from '../shared-kernel/pose-name';

/**
 * A tag of the closed list of the catalog (story 8, ADR 0032, ADR 0034): a term of the community without translation
 * (« pop », « whip »), its description, the tag it adds when chosen (« dynamique » for « pop ») and the number of
 * published transitions carrying it.
 */
export type Tag = {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly impliedTagId: string | null;
  readonly transitionCount: number;
};

/** A tag designated by its identifier and its current name. */
export type NamedTag = { readonly id: string; readonly name: string };

/** A transition carrying a tag, published or proposed: its poses and its optional name (ADR 0034). */
export type TagCarrier = {
  readonly id: string;
  readonly fromPose: { readonly id: string; readonly name: string };
  readonly toPose: { readonly id: string; readonly name: string };
  readonly name: string | null;
};

export type TagNameError = 'tag.name-required' | 'tag.name-without-letter-or-digit' | 'tag.name-too-long';

export type TagDescriptionError = 'tag.description-required' | 'tag.description-too-long';

/** Same rules as the API (TagName.MaxLength, TagDescription.MaxLength): characters counted once normalised. */
export const tagNamePolicy = { maxLength: 30 } as const;
export const tagDescriptionPolicy = { maxLength: 200 } as const;

/** Length of the name once normalised (the normalisation of a pose name), in code points: the measure of the API. */
export const tagNameLength = (raw: string): number => [...normalizePoseName(raw)].length;

/** As the API normalises it: NFC, without superfluous spaces (leading, trailing or consecutive, line breaks included). */
const normalizeTagDescription = (raw: string): string =>
  raw
    .normalize('NFC')
    .split(/\s+/u)
    .filter((part) => part !== '')
    .join(' ');

/** Length of the description once normalised, in code points: the measure of the API. */
export const tagDescriptionLength = (raw: string): number => [...normalizeTagDescription(raw)].length;

/** The normalised name, or the first rule it breaks (same codes as the API). */
export const checkTagName = (raw: string): Result<string, TagNameError> => {
  const name = normalizePoseName(raw);
  if (name === '') return fail('tag.name-required');
  if (!/[\p{L}\p{Nd}]/u.test(name)) return fail('tag.name-without-letter-or-digit');
  if ([...name].length > tagNamePolicy.maxLength) return fail('tag.name-too-long');
  return ok(name);
};

/** The normalised description, or the first rule it breaks (same codes as the API). */
export const checkTagDescription = (raw: string): Result<string, TagDescriptionError> => {
  const description = normalizeTagDescription(raw);
  if (description === '') return fail('tag.description-required');
  if ([...description].length > tagDescriptionPolicy.maxLength) return fail('tag.description-too-long');
  return ok(description);
};

/** The name and the description of a tag, as typed. */
export type TagInput = { readonly name: string; readonly description: string };

/** The name and the description of a tag, normalised and valid: what is sent to the API. */
export type ValidTagContent = { readonly name: string; readonly description: string };

export type TagFieldError =
  | { readonly field: 'name'; readonly code: TagNameError }
  | { readonly field: 'description'; readonly code: TagDescriptionError };

/** The content to send, or every field in error, in the order of the form. */
export const checkTagContent = (input: TagInput): Result<ValidTagContent, readonly TagFieldError[]> => {
  const name = checkTagName(input.name);
  const description = checkTagDescription(input.description);
  const errors: TagFieldError[] = [];
  if (!name.ok) errors.push({ field: 'name', code: name.error });
  if (!description.ok) errors.push({ field: 'description', code: description.error });
  if (!name.ok || !description.ok) return fail(errors);
  return ok({ name: name.value, description: description.value });
};
