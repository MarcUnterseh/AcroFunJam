/**
 * The free text a validator writes for a contributor (rejection reason, adjustment note): same normalisation and
 * same measure as the API (ValidatorText, ADR 0022).
 */
export const validatorTextPolicy = { maxLength: 500 } as const;

/** Without superfluous spaces: leading, trailing or consecutive (a line break counts as a space). */
export const normalizeValidatorText = (raw: string): string =>
  raw
    .split(/\s+/u)
    .filter((part) => part !== '')
    .join(' ');

/** Length once normalised, in code points: the measure of the API and of PostgreSQL char_length. */
export const validatorTextLength = (raw: string): number => [...normalizeValidatorText(raw)].length;

/** Whether a normalised text is over the limit. */
export const isValidatorTextTooLong = (text: string): boolean =>
  [...text].length > validatorTextPolicy.maxLength;
