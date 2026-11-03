import { fail, ok, type Result } from '../common/result';

/** Usual name of a pose, normalised (shared kernel of Catalog and Contribution, ADR 0015). */
export type PoseName = string & { readonly __brand: 'PoseName' };

export type PoseNameError = 'pose.name-required' | 'pose.name-too-long';

/** Same rule as the API (PoseName.MaxLength): characters counted after normalisation. */
export const poseNamePolicy = { maxLength: 60 } as const;

/** As typed (NFC, so that an accent counts as one character), without superfluous spaces. Same rule as the API. */
export const normalizePoseName = (raw: string): string =>
  raw
    .normalize('NFC')
    .split(/\s+/u)
    .filter((part) => part !== '')
    .join(' ');

/** Length of the name once normalised, in code points: the measure of the API and of PostgreSQL char_length. */
export const poseNameLength = (raw: string): number => [...normalizePoseName(raw)].length;

// A name without any letter or digit has an empty comparison key on the API side (ADR 0017): it is no name.
const hasLetterOrDigit = (name: string) => /[\p{L}\p{Nd}]/u.test(name);

/** The normalised name, or the first rule it breaks (same codes as the API). */
export const checkPoseName = (raw: string): Result<PoseName, PoseNameError> => {
  const name = normalizePoseName(raw);
  if (!hasLetterOrDigit(name)) return fail('pose.name-required');
  if ([...name].length > poseNamePolicy.maxLength) return fail('pose.name-too-long');
  return ok(name as PoseName);
};
