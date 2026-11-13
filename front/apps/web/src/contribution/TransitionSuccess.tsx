import {
  transitionProposalSuccess,
  transitionSuccessActions,
  type TransitionPose,
  type TransitionProposalOutcome,
} from '@acrofunjam/core';
import { useEffect, useId, useRef } from 'react';
import { Link } from 'react-router';
import { Icon } from '../layout/Icon';
import { myProposalsPath, posePath } from '../paths';

/**
 * Success panel of a transition (docs/design/composants/panneau-succes.md, « Variante transition »), in place of the
 * form: what became of the transition, from the status returned by the API, then the ways out, all secondary, in the
 * validated order. Its title takes the focus, described by its text.
 */
export function TransitionSuccess({
  outcome,
  origin,
  onProposeAnother,
}: {
  readonly outcome: TransitionProposalOutcome;
  /** The pose the form was opened from: « Proposer une autre transition depuis … », « Revenir à … ». */
  readonly origin: TransitionPose;
  readonly onProposeAnother: () => void;
}) {
  const title = useRef<HTMLHeadingElement>(null);
  const textId = useId();
  const { title: heading, text } = transitionProposalSuccess(outcome);

  useEffect(() => title.current?.focus(), []);

  return (
    <div className="proposal-success">
      <div className="success-panel">
        <Icon name="success" />
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
        {transitionSuccessActions(outcome.status, origin.name).map(({ action, label }) => {
          switch (action) {
            case 'see-my-proposals':
              return (
                <Link key={action} to={myProposalsPath} className="button button--secondary link-button">
                  {label}
                </Link>
              );
            case 'propose-another':
              return (
                <button
                  key={action}
                  type="button"
                  className="button button--secondary"
                  onClick={onProposeAnother}
                >
                  {label}
                </button>
              );
            case 'see-pose':
              return (
                <Link key={action} to={posePath(origin.id)} className="button button--secondary link-button">
                  {label}
                </Link>
              );
          }
        })}
      </div>
    </div>
  );
}
