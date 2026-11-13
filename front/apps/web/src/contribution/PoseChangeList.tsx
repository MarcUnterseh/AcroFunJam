import { valueChangeLine, type PoseValueChange } from '@acrofunjam/core';
import { ValueChangeList } from './ValueChangeList';

/**
 * The fields of a pose that change, « avant → après » (docs/design/composants/recapitulatif-modification.md), in
 * the order of the form; the reading key and the visually hidden texts depend on where it is shown (validation
 * queue, form of a validator, « Mes propositions »).
 */
export function PoseChangeList({
  changes,
  readingKey,
  beforeLabel,
  afterLabel,
}: {
  readonly changes: readonly PoseValueChange[];
  readonly readingKey: string;
  readonly beforeLabel: string;
  readonly afterLabel: string;
}) {
  const lines = changes.map((change) => ({ key: change.field, ...valueChangeLine(change) }));
  return (
    <ValueChangeList
      lines={lines}
      readingKey={readingKey}
      beforeLabel={beforeLabel}
      afterLabel={afterLabel}
    />
  );
}
