import { decisionReport, validationLabels, type RecordedDecision } from '@acrofunjam/core';
import { useEffect, useRef } from 'react';
import { Link } from 'react-router';
import { Icon } from '../layout/Icon';
import { catalogPath } from '../paths';

/**
 * Report of a decision (docs/design/composants/compte-rendu-decision.md), in place of the card of the proposal
 * until the page is loaded again: success for a publication, information for a rejection. Its title keeps the
 * heading level of the cards (h2) and takes the focus, so that the person does not lose their place.
 */
export function DecisionReport({ recorded }: { readonly recorded: RecordedDecision }) {
  const title = useRef<HTMLHeadingElement>(null);
  const { title: heading, text } = decisionReport(recorded);
  const accepted = recorded.decision === 'accepted';

  useEffect(() => title.current?.focus(), []);

  return (
    <div className={`decision-report decision-report--${accepted ? 'accepted' : 'rejected'}`}>
      <Icon name={accepted ? 'success' : 'info'} />
      <div className="decision-report__content">
        <h2 ref={title} tabIndex={-1} className="decision-report__title">
          {heading}
        </h2>
        {text && <p className="decision-report__text">{text}</p>}
        {accepted && (
          <Link to={catalogPath} className="decision-report__link">
            {validationLabels.seeCatalog}
          </Link>
        )}
      </div>
    </div>
  );
}
