import { adjustmentLine, validationLabels, type PoseAdjustment } from '@acrofunjam/core';
import { forwardRef, type ReactNode } from 'react';
import { Icon } from '../layout/Icon';

const [proposedKey, retainedKey] = validationLabels.summaryKey.split(' → ');

/**
 * Summary « proposé → retenu » (docs/design/composants/recapitulatif-ajustements.md): the adjusted values only,
 * in the order of the form. Read « Difficulté flyer : Proposé : Intermédiaire, retenu : Découverte »: the arrow is
 * hidden, visually hidden texts say which value is which. Followed by the optional message and the actions.
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
      <p className="adjustment-summary__key" aria-hidden="true">
        {proposedKey}
        <Icon name="arrow" />
        {retainedKey}
      </p>
      <dl className="adjustment-summary__list">
        {adjustments.map((adjustment) => {
          const line = adjustmentLine(adjustment);
          return (
            <div key={adjustment.field} className="adjustment">
              <dt>{line.term}</dt>
              <dd>
                <span className="adjustment__proposed">
                  <span className="visually-hidden">{validationLabels.summaryProposed}</span>
                  {line.proposed}
                </span>
                <span className="adjustment__change">
                  <Icon name="arrow" />
                  <span className="adjustment__retained">
                    <span className="visually-hidden">{validationLabels.summaryRetained}</span>
                    {line.retained}
                  </span>
                </span>
              </dd>
            </div>
          );
        })}
      </dl>
      <p className="adjustment-summary__rest">{validationLabels.summaryRest}</p>
      {children}
    </div>
  );
});
