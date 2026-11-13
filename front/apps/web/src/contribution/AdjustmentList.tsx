import { adjustmentLine, validationLabels, type PoseAdjustment } from '@acrofunjam/core';
import { ValueChangeList } from './ValueChangeList';

/**
 * The adjusted values « proposé → retenu » (docs/design/composants/recapitulatif-ajustements.md), in the order of
 * the form, preceded by its reading key; the same for the validator (story 4) and the contributor (story 5).
 */
export function AdjustmentList({ adjustments }: { readonly adjustments: readonly PoseAdjustment[] }) {
  const lines = adjustments.map((adjustment) => {
    const { term, proposed, retained } = adjustmentLine(adjustment);
    return { key: adjustment.field, term, before: proposed, after: retained };
  });
  return (
    <ValueChangeList
      lines={lines}
      readingKey={validationLabels.summaryKey}
      beforeLabel={validationLabels.summaryProposed}
      afterLabel={validationLabels.summaryRetained}
    />
  );
}
