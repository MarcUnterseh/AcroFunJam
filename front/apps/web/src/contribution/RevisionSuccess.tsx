import { myProposalsLabels, revisionLabels, revisionSuccess, type ProposalOutcome } from '@acrofunjam/core';
import { useEffect, useId, useRef } from 'react';
import { Link } from 'react-router';
import { Icon } from '../layout/Icon';
import { catalogPath, myProposalsPath } from '../paths';

/**
 * Success panel of a revision (docs/design/composants/panneau-succes.md, « Variante modification »), in place of
 * the form: what became of the revision, from the status returned by the API, then the ways out. No « propose
 * another »: nothing is pushed. Its title takes the focus; for a pending revision, it is described by its text.
 */
export function RevisionSuccess({ outcome }: { readonly outcome: ProposalOutcome }) {
  const title = useRef<HTMLHeadingElement>(null);
  const textId = useId();
  const { title: heading, text } = revisionSuccess(outcome);

  useEffect(() => title.current?.focus(), []);

  return (
    <div className="proposal-success">
      <div className="success-panel">
        <Icon name="burst" />
        <h2
          ref={title}
          tabIndex={-1}
          className="success-panel__title"
          aria-describedby={text ? textId : undefined}
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
        {outcome.status !== 'published' && (
          <Link to={myProposalsPath} className="button button--secondary link-button">
            {myProposalsLabels.seeMyProposals}
          </Link>
        )}
        <Link to={catalogPath} className="button button--secondary link-button">
          {revisionLabels.seeCatalog}
        </Link>
      </div>
    </div>
  );
}
