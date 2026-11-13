import { descriptionCounterLabel, transitionDescriptionPolicy } from '@acrofunjam/core';
import { Icon } from '../layout/Icon';

/** The counter of the description of a transition, as announced by stages (useCounterAnnouncement). */
export const descriptionCounter = {
  labelOf: descriptionCounterLabel,
  maxLength: transitionDescriptionPolicy.maxLength,
} as const;

/** Counter under the description of a transition (champ.md, zone de texte): from 450 characters, once normalised. */
export function DescriptionCounter({ length }: { readonly length: number }) {
  const label = descriptionCounterLabel(length);
  if (!label) return null;
  const over = length > transitionDescriptionPolicy.maxLength;
  return (
    <p className={`field__counter${over ? ' field__counter--over' : ''}`}>
      {over && <Icon name="error" />}
      {label}
    </p>
  );
}
