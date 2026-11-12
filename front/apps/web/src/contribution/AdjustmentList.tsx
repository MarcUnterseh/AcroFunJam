import { adjustmentLine, validationLabels, type PoseAdjustment } from '@acrofunjam/core';
import { Icon } from '../layout/Icon';

const [proposedKey, retainedKey] = validationLabels.summaryKey.split(' → ');

/**
 * The adjusted values « proposé → retenu » (docs/design/composants/recapitulatif-ajustements.md), in the order of
 * the form, preceded by its reading key; the same for the validator (story 4) and the contributor (story 5). Read
 * « Difficulté flyer : Proposé : Intermédiaire, retenu : Découverte »: the arrow is hidden, visually hidden texts
 * say which value is which.
 */
export function AdjustmentList({ adjustments }: { readonly adjustments: readonly PoseAdjustment[] }) {
  return (
    <>
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
    </>
  );
}
