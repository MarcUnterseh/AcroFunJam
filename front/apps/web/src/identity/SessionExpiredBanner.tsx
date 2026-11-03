import { useEffect } from 'react';
import { Link, useLocation } from 'react-router';
import { Icon } from '../layout/Icon';
import { useAnnounce } from '../layout/Announcer';
import { focusPageTitle } from '../layout/focus';
import { useRouteFlag } from '../layout/route-handle';
import { signInPath } from '../paths';
import { returnPathFrom } from './return-path';
import { useSession } from './SessionContext';

/**
 * Discreet banner (docs/design/composants/bandeau-information.md): the person stays on the page.
 * Not on the pages that tell it themselves (sign-in, registration, a form with its own alert: route handle).
 */
export function SessionExpiredBanner() {
  const { expired, dismissExpired } = useSession();
  const location = useLocation();
  const announce = useAnnounce();
  const ownNotice = useRouteFlag('ownSessionNotice');
  const shown = expired && !ownNotice;

  useEffect(() => {
    if (shown) announce('Ta session a expiré. Tu peux te reconnecter.');
  }, [shown, announce]);

  if (!shown) return null;

  const close = () => {
    dismissExpired();
    focusPageTitle(); // the close button disappears: do not lose the focus
  };

  return (
    <section aria-label="Session expirée" className="info-banner">
      <p>
        <Icon name="info" /> Ta session a expiré.{' '}
        <Link to={signInPath(returnPathFrom(location))}>Se connecter</Link>
      </p>
      <button type="button" className="info-banner__close" onClick={close}>
        Fermer
      </button>
    </section>
  );
}
