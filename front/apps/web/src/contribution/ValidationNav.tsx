import { canValidateProposals, pendingBadge, pendingCountSuffix, validationLabels } from '@acrofunjam/core';
import { useEffect, useRef } from 'react';
import { NavLink, useLocation } from 'react-router';
import { useSession } from '../identity/SessionContext';
import { validationPath } from '../paths';
import { usePendingCount, usePendingCountUpdates } from './usePendingCount';

/**
 * Navigation « Contribution » of the header (docs/design/composants/en-tete.md), for validators and
 * administrators only: the link « Propositions à valider » and the badge of the pending proposals
 * (pastille-compteur.md). No aria-label: the accessible name follows the text, the long label (visually
 * hidden under 64em) and the count (visually hidden); the short label and the badge are hidden from
 * assistive technologies.
 */
export function ValidationNav() {
  const { session } = useSession();
  const allowed = canValidateProposals(session);
  const count = usePendingCount(allowed);
  const { reread } = usePendingCountUpdates();
  const { pathname } = useLocation();

  // Read again after each navigation, not on the first display (the query does it).
  const firstPath = useRef(true);
  useEffect(() => {
    if (firstPath.current) {
      firstPath.current = false;
      return;
    }
    reread();
  }, [pathname, reread]);

  if (!allowed) return null;
  const badge = pendingBadge(count);
  // « (3 en attente) »: the rest of the accessible name, after the title.
  const pending = pendingCountSuffix(count);
  return (
    <nav aria-label={validationLabels.navigation} className="site-header__contribution">
      <NavLink to={validationPath} className="button button--secondary validation-link">
        <span className="validation-link__long">{validationLabels.title}</span>
        <span className="validation-link__short" aria-hidden="true">
          {validationLabels.shortTitle}
        </span>
        {badge && (
          <span className="badge" aria-hidden="true">
            {badge}
          </span>
        )}
        {pending && (
          <>
            {' '}
            <span className="visually-hidden">{pending}</span>
          </>
        )}
      </NavLink>
    </nav>
  );
}
