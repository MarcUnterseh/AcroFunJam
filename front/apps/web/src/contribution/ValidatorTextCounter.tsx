import { validatorTextCounterLabel, validatorTextPolicy } from '@acrofunjam/core';
import { Icon } from '../layout/Icon';

/** The counter of a reason or a message, as announced by stages (useCounterAnnouncement). */
export const validatorTextCounter = {
  labelOf: validatorTextCounterLabel,
  maxLength: validatorTextPolicy.maxLength,
} as const;

/** Counter under a reason or a message (champ.md, zone de texte): from 450 characters, counted once normalised. */
export function ValidatorTextCounter({ length }: { readonly length: number }) {
  const label = validatorTextCounterLabel(length);
  if (!label) return null;
  const over = length > validatorTextPolicy.maxLength;
  return (
    <p className={`field__counter${over ? ' field__counter--over' : ''}`}>
      {over && <Icon name="error" />}
      {label}
    </p>
  );
}
