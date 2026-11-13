import { canPropose, revisionLabels } from '@acrofunjam/core';
import { useEffect, useState } from 'react';
import { Navigate, useParams } from 'react-router';
import { useSession } from '../identity/SessionContext';
import { useBusyMain } from '../layout/useBusyMain';
import { catalogPath, revisionPath, signInPath } from '../paths';
import { RevisionForm } from './RevisionForm';

/**
 * Page « Proposer une modification » of a published pose (docs/design/ecrans/6-proposer-une-modification.md), for
 * a signed-in person who may propose (capability "propose"). A visitor is sent to the sign-in page, and comes back
 * to the form of the same pose afterwards. Once the form is shown, it stays: a session that expires meanwhile is
 * told in the form (the input is kept), and signing out leads to the catalog.
 */
export function ProposeRevisionPage() {
  const { id: poseId = '' } = useParams();
  const { session } = useSession();
  const allowed = canPropose(session);
  // Derived from the previous renders: the form was shown to a person who could propose, whose address owns the
  // input kept in the tab (ADR 0019).
  const [owner, setOwner] = useState<string | null>(null);
  if (allowed && session.status === 'signedIn' && session.email !== owner) setOwner(session.email);

  useEffect(() => {
    document.title = `${revisionLabels.title} – AcroFunJam`;
  }, []);
  useBusyMain(session.status === 'checking');

  const expired = session.status === 'visitor' && session.notice === 'expired';
  if (owner && session.status === 'visitor' && !expired) return <Navigate to={catalogPath} replace />;
  if (!owner && session.status === 'visitor')
    return <Navigate to={signInPath(revisionPath(poseId))} replace />;
  if (session.status === 'signedIn' && !allowed) return <Navigate to={catalogPath} replace />;

  return (
    <section className="proposal-page revision-page">
      <h1 tabIndex={-1}>{revisionLabels.title}</h1>
      {owner && (
        <RevisionForm key={`${owner} ${poseId}`} poseId={poseId} owner={owner} sessionExpired={expired} />
      )}
    </section>
  );
}
