import { canPropose, proposalLabels } from '@acrofunjam/core';
import { useEffect, useLayoutEffect, useState } from 'react';
import { Navigate } from 'react-router';
import { useSession } from '../identity/SessionContext';
import { catalogPath, proposePosePath, signInPath } from '../paths';
import { ProposalForm } from './ProposalForm';

/** While the session is checked, main is busy: only the title is shown, never the form (not even briefly). */
function useBusyMain(busy: boolean) {
  useLayoutEffect(() => {
    const main = document.querySelector('main');
    if (!busy || !main) return;
    main.setAttribute('aria-busy', 'true');
    return () => main.removeAttribute('aria-busy');
  }, [busy]);
}

/**
 * Page « Proposer une pose » (docs/design/ecrans/3-proposer-une-pose.md), for a signed-in person who may propose
 * (capability "propose", ADR 0019). A visitor is sent to the sign-in page, and comes back here afterwards.
 * Once the form is shown, it stays: a session that expires meanwhile is told in the form (the input is kept),
 * and signing out leads to the catalog.
 */
export function ProposePosePage() {
  const { session } = useSession();
  const allowed = canPropose(session);
  // Derived from the previous renders: the form was shown to a person who could propose, whose address owns
  // the input kept in the tab (ADR 0019).
  const [owner, setOwner] = useState<string | null>(null);
  if (allowed && session.status === 'signedIn' && session.email !== owner) setOwner(session.email);

  useEffect(() => {
    document.title = `${proposalLabels.title} – AcroFunJam`;
  }, []);
  useBusyMain(session.status === 'checking');

  const expired = session.status === 'visitor' && session.notice === 'expired';
  if (owner && session.status === 'visitor' && !expired) return <Navigate to={catalogPath} replace />;
  if (!owner && session.status === 'visitor') return <Navigate to={signInPath(proposePosePath)} replace />;
  // Signed in without the capability to propose (no role lacks it today): nothing to do here (ADR 0019).
  if (session.status === 'signedIn' && !allowed) return <Navigate to={catalogPath} replace />;

  return (
    <section className="proposal-page">
      <h1 tabIndex={-1}>{proposalLabels.title}</h1>
      {owner && <ProposalForm key={owner} owner={owner} sessionExpired={expired} />}
    </section>
  );
}
