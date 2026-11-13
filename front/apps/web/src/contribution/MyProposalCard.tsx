import {
  myProposalsLabels,
  myProposalStatusLabel,
  myRevisionLabels,
  submittedLine,
  type MyPoseRevision,
  type MyProposal,
} from '@acrofunjam/core';
import { useId } from 'react';
import { PoseDetails } from '../catalog/PoseList';
import { Icon } from '../layout/Icon';
import { AdjustmentList } from './AdjustmentList';
import { PoseChangeList } from './PoseChangeList';

const icons = { clock: 'clock', success: 'success', information: 'info' } as const;

/**
 * Status of a proposal (docs/design/composants/statut-proposition.md): a lasting state, not an alert; the icon is
 * coloured by the tone, the words stay in the colours of the text.
 */
function MyProposalStatus({ proposal }: { readonly proposal: MyProposal }) {
  const status = myProposalStatusLabel(proposal.status, proposal.kind);
  return (
    <div className={`my-proposal-status my-proposal-status--${status.tone}`}>
      <Icon name={icons[status.symbol]} />
      <div>
        <p className="my-proposal-status__text">
          {status.prefix && <span className="visually-hidden">{status.prefix}</span>}
          {status.text}
          {status.day && <time dateTime={status.day.dateTime}>{status.day.label}</time>}
        </p>
        {status.consequence && <p className="my-proposal-status__consequence">{status.consequence}</p>}
      </div>
    </div>
  );
}

/** A text of the validator (message, reason), presented as such: its label, then the text, without quotes. */
function ValidatorText({ label, text }: { readonly label: string; readonly text: string }) {
  return (
    <div className="my-proposal__validator-text">
      <p className="my-proposal__validator-text-label">{label}</p>
      <p className="my-proposal__validator-text-content">{text}</p>
    </div>
  );
}

/**
 * What a revision changes in the pose (carte-ma-modification.md): before → proposed, or before → retained once
 * accepted with adjustments; the changed fields only.
 */
function RevisionChanges({ revision }: { readonly revision: MyPoseRevision }) {
  const retained = revision.status.kind === 'accepted-with-adjustments';
  return (
    <div className="adjustment-summary my-proposal__adjustments">
      <h3 className="proposal-card__zone-title">{myRevisionLabels.changesTitle}</h3>
      <PoseChangeList
        changes={revision.changes}
        readingKey={retained ? myRevisionLabels.retainedKey : myRevisionLabels.proposedKey}
        beforeLabel={myRevisionLabels.before}
        afterLabel={retained ? myRevisionLabels.retained : myRevisionLabels.proposed}
      />
    </div>
  );
}

/**
 * A proposal of the requester (docs/design/composants/carte-ma-proposition.md): which pose, when, what became of
 * it and why, then the pose itself. Read only: no action, no focus, and nothing designates the validator. A
 * revision (carte-ma-modification.md, story 6) is titled « Modification de <nom> » (the name when proposed) and
 * presents what changes in the pose rather than the pose.
 */
export function MyProposalCard({ proposal }: { readonly proposal: MyProposal }) {
  const titleId = useId();
  const submittedId = useId();
  const submitted = submittedLine(proposal.submittedAt);
  // Described by its date: two proposals of the same pose (proposed again after a rejection) are told apart.
  return (
    <article className="proposal-card my-proposal" aria-labelledby={titleId} aria-describedby={submittedId}>
      <h2 id={titleId} className="proposal-card__name">
        {proposal.kind === 'pose-revision' ? (
          <>
            {/* The space outside the prefix: the accessible name reads « Modification de Throne ». */}
            <span className="proposal-card__name-prefix">{myRevisionLabels.titlePrefix.trim()}</span>
            {` ${proposal.poseName}`}
          </>
        ) : (
          proposal.pose.name
        )}
      </h2>
      <p id={submittedId} className="my-proposal__submitted">
        {submitted.before}
        <time dateTime={proposal.submittedAt.toISOString()}>{submitted.day}</time>
      </p>
      <div className="my-proposal__decision">
        <MyProposalStatus proposal={proposal} />
        {proposal.kind === 'pose-revision' && <RevisionChanges revision={proposal} />}
        {proposal.status.kind === 'accepted-with-adjustments' && (
          <div className="adjustment-summary my-proposal__adjustments">
            <h3 className="proposal-card__zone-title">{myProposalsLabels.adjustmentsTitle}</h3>
            <AdjustmentList adjustments={proposal.status.adjustments} />
            <p className="adjustment-summary__rest">{myProposalsLabels.adjustmentsRest}</p>
          </div>
        )}
        {proposal.status.kind === 'accepted-with-adjustments' && proposal.status.message && (
          <ValidatorText label={myProposalsLabels.message} text={proposal.status.message} />
        )}
        {proposal.status.kind === 'rejected' && (
          <ValidatorText label={myProposalsLabels.reason} text={proposal.status.reason} />
        )}
      </div>
      {proposal.kind === 'pose-proposal' && (
        <div className="my-proposal__pose">
          <PoseDetails pose={proposal.pose} />
        </div>
      )}
    </article>
  );
}
