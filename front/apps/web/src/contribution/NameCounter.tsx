import { nameCounterLabel, poseNamePolicy } from '@acrofunjam/core';
import { Icon } from '../layout/Icon';

/** The counter of the name of a pose, as announced by stages (useCounterAnnouncement). */
export const nameCounter = { labelOf: nameCounterLabel, maxLength: poseNamePolicy.maxLength } as const;

/** Counter under the name of a pose (champ.md): from 50 characters, counted once normalised. */
export function NameCounter({ length }: { readonly length: number }) {
  const label = nameCounterLabel(length);
  if (!label) return null;
  const over = length > poseNamePolicy.maxLength;
  return (
    <p className={`field__counter${over ? ' field__counter--over' : ''}`}>
      {over && <Icon name="error" />}
      {label}
    </p>
  );
}
