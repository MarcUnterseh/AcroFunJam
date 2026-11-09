import { canValidateProposals, validationLabels } from '@acrofunjam/core';
import { useEffect, useState } from 'react';
import { Navigate } from 'react-router';
import { useSession } from '../identity/SessionContext';
import { useBusyMain } from '../layout/useBusyMain';
import { catalogPath, signInPath, validationPath } from '../paths';
import { ValidationQueue } from './ValidationQueue';

/**
 * Page « Propositions à valider » (docs/design/ecrans/4-valider-une-proposition.md), for a validator or an
 * administrator (capability "validate-proposals", ADR 0019). A visitor is sent to the sign-in page, and comes
 * back here afterwards; anyone else is sent to the catalog. Once the queue is shown, it stays: a session that
 * expires meanwhile is told in the card concerned (the input is kept), and signing out leads to the catalog.
 */
export function ValidationPage() {
  const { session } = useSession();
  const allowed = canValidateProposals(session);
  // Derived from the previous renders: the queue was shown to this validator, whose address owns the input
  // kept in the tab (ADR 0019).
  const [owner, setOwner] = useState<string | null>(null);
  if (allowed && session.status === 'signedIn' && session.email !== owner) setOwner(session.email);

  useEffect(() => {
    document.title = `${validationLabels.title} – AcroFunJam`;
  }, []);
  useBusyMain(session.status === 'checking');

  const expired = session.status === 'visitor' && session.notice === 'expired';
  if (owner && session.status === 'visitor' && !expired) return <Navigate to={catalogPath} replace />;
  if (!owner && session.status === 'visitor') return <Navigate to={signInPath(validationPath)} replace />;
  if (session.status === 'signedIn' && !allowed) return <Navigate to={catalogPath} replace />;

  return (
    <section className="validation-page">
      <h1 tabIndex={-1}>{validationLabels.title}</h1>
      {owner && <ValidationQueue key={owner} owner={owner} />}
    </section>
  );
}
