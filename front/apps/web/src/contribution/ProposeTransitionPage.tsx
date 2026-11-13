import { canPropose, transitionProposalLabels } from '@acrofunjam/core';
import { useEffect, useId, useState } from 'react';
import { Navigate, useParams } from 'react-router';
import { useSession } from '../identity/SessionContext';
import { useBusyMain } from '../layout/useBusyMain';
import { catalogPath, posePath, signInPath, transitionProposalPath } from '../paths';
import { TransitionForm } from './TransitionForm';

/**
 * Page « Proposer une transition » from a published pose (docs/design/ecrans/7-proposer-une-transition.md), for a
 * signed-in person who may propose (capability "propose"). A visitor is sent to the sign-in page, and comes back to
 * the form of the same pose afterwards. Once the form is shown, it stays: a session that expires meanwhile is told
 * in the form (the input is kept), and signing out leads to the catalog.
 */
export function ProposeTransitionPage() {
  const { id: poseId = '' } = useParams();
  const { session } = useSession();
  const allowed = canPropose(session);
  // Derived from the previous renders: the form was shown to a person who could propose, whose address owns the
  // input kept in the tab (ADR 0019).
  const [owner, setOwner] = useState<string | null>(null);
  const titleId = useId();
  if (allowed && session.status === 'signedIn' && session.email !== owner) setOwner(session.email);

  useEffect(() => {
    document.title = `${transitionProposalLabels.title} – AcroFunJam`;
  }, []);
  useBusyMain(session.status === 'checking');

  const expired = session.status === 'visitor' && session.notice === 'expired';
  // Signed out from the form: back to the page of the pose of origin.
  if (owner && session.status === 'visitor' && !expired) return <Navigate to={posePath(poseId)} replace />;
  if (!owner && session.status === 'visitor')
    return <Navigate to={signInPath(transitionProposalPath(poseId))} replace />;
  if (session.status === 'signedIn' && !allowed) return <Navigate to={catalogPath} replace />;

  return (
    <section className="proposal-page transition-page">
      <h1 id={titleId} tabIndex={-1}>
        {transitionProposalLabels.title}
      </h1>
      {owner && (
        <TransitionForm
          key={`${owner} ${poseId}`}
          originPoseId={poseId}
          owner={owner}
          sessionExpired={expired}
          titleId={titleId}
        />
      )}
    </section>
  );
}
