import { canPropose, myProposalsLabels } from '@acrofunjam/core';
import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router';
import { useSession } from '../identity/SessionContext';
import { useAnnounce } from '../layout/Announcer';
import { useBusyMain } from '../layout/useBusyMain';
import { catalogPath, myProposalsPath, signInPath } from '../paths';
import { MyProposalList } from './MyProposalList';

/**
 * Page « Mes propositions » (docs/design/ecrans/5-mes-propositions.md), for a person who may propose (capability
 * "propose", ADR 0019). A visitor is sent to the sign-in page, and comes back here afterwards; signing out leads
 * to the catalog. An expired session (as the list loads, or already when the page opens) is told by the page
 * itself, in a lasting block offering to sign in again and come back here. The list is the one of the person
 * signed in: another person gets their own.
 */
/** The session expired: a lasting block, in the style of the empty page, announced once shown. */
function SessionExpired() {
  const announce = useAnnounce();
  useEffect(() => announce(myProposalsLabels.sessionExpiredAnnouncement), [announce]);
  return (
    <div className="catalog-empty validation-empty">
      <p className="validation-empty__title">{myProposalsLabels.sessionExpiredTitle}</p>
      <p className="validation-empty__text">{myProposalsLabels.sessionExpiredText}</p>
      <Link to={signInPath(myProposalsPath)} className="button button--primary link-button">
        {myProposalsLabels.signIn}
      </Link>
    </div>
  );
}

export function MyProposalsPage() {
  const { session } = useSession();
  const allowed = canPropose(session);
  // Derived from the previous renders: the proposals were shown to this person.
  const [owner, setOwner] = useState<string | null>(null);
  if (allowed && session.status === 'signedIn' && session.email !== owner) setOwner(session.email);

  useEffect(() => {
    document.title = `${myProposalsLabels.title} – AcroFunJam`;
  }, []);
  useBusyMain(session.status === 'checking');

  const expired = session.status === 'visitor' && session.notice === 'expired';
  if (owner && session.status === 'visitor' && !expired) return <Navigate to={catalogPath} replace />;
  if (!owner && session.status === 'visitor' && !expired)
    return <Navigate to={signInPath(myProposalsPath)} replace />;
  // Signed in without the capability to propose (no role lacks it today): nothing to follow here.
  if (session.status === 'signedIn' && !allowed) return <Navigate to={catalogPath} replace />;

  return (
    <section className="follow-up-page">
      <h1 tabIndex={-1}>{myProposalsLabels.title}</h1>
      {allowed && session.status === 'signedIn' && <MyProposalList key={session.email} />}
      {expired && <SessionExpired />}
    </section>
  );
}
