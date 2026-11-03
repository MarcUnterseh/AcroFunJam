import { proposalLabels, proposalSuccess, type ProposalOutcome } from '@acrofunjam/core';
import { useEffect, useId, useRef } from 'react';
import { Link } from 'react-router';
import { Icon } from '../layout/Icon';
import { catalogPath } from '../paths';

/**
 * Success panel (docs/design/composants/panneau-succes.md), in place of the form: what became of the proposal,
 * from the status returned by the API, then the next steps. Its title takes the focus: a single announcement;
 * for a pending proposal, the title is described by its text (what happens next).
 */
export function ProposalSuccess({
  outcome,
  onProposeAnother,
}: {
  readonly outcome: ProposalOutcome;
  readonly onProposeAnother: () => void;
}) {
  const title = useRef<HTMLHeadingElement>(null);
  const textId = useId();
  const { title: heading, text } = proposalSuccess(outcome);

  useEffect(() => title.current?.focus(), []);

  return (
    <div className="proposal-success">
      <div className="success-panel">
        <Icon name="success" />
        <h2
          ref={title}
          tabIndex={-1}
          className="success-panel__title"
          aria-describedby={outcome.status === 'pending' ? textId : undefined}
        >
          {heading}
        </h2>
        {text && (
          <p id={textId} className="success-panel__text">
            {text}
          </p>
        )}
      </div>
      <div className="proposal-success__actions">
        <button type="button" className="button button--primary" onClick={onProposeAnother}>
          {proposalLabels.proposeAnother}
        </button>
        <Link to={catalogPath} className="button button--secondary link-button">
          {proposalLabels.seeCatalog}
        </Link>
      </div>
    </div>
  );
}
