import { validationLabels, type PoseAdjustment } from '@acrofunjam/core';
import { forwardRef, type ReactNode } from 'react';
import { AdjustmentList } from './AdjustmentList';

/**
 * Summary « proposé → retenu » of the validator (docs/design/composants/recapitulatif-ajustements.md): its title
 * takes the focus, then the adjusted values only, followed by the optional message and the actions.
 */
export const AdjustmentSummary = forwardRef<
  HTMLHeadingElement,
  { readonly adjustments: readonly PoseAdjustment[]; readonly children: ReactNode }
>(function AdjustmentSummary({ adjustments, children }, title) {
  return (
    <div className="proposal-card__zone adjustment-summary">
      <h3 ref={title} tabIndex={-1} className="proposal-card__zone-title">
        {validationLabels.summaryTitle}
      </h3>
      <AdjustmentList adjustments={adjustments} />
      <p className="adjustment-summary__rest">{validationLabels.summaryRest}</p>
      {children}
    </div>
  );
});
