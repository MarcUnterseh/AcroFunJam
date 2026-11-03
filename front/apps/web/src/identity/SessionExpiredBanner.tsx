import { useEffect } from 'react';
import { Link, useLocation } from 'react-router';
import { Icon } from '../layout/Icon';
import { useAnnounce } from '../layout/Announcer';
import { focusPageTitle } from '../layout/focus';
import { returnPathFrom } from './return-path';
import { useSession } from './SessionContext';

/** Discreet banner (docs/design/composants/bandeau-information.md): the person stays on the page. */
export function SessionExpiredBanner() {
  const { expired, dismissExpired } = useSession();
  const location = useLocation();
  const announce = useAnnounce();

  useEffect(() => {
    if (expired) announce('Ta session a expiré. Tu peux te reconnecter.');
  }, [expired, announce]);

  if (!expired) return null;

  const close = () => {
    dismissExpired();
    focusPageTitle(); // the close button disappears: do not lose the focus
  };

  const retour = encodeURIComponent(returnPathFrom(location));
  return (
    <section aria-label="Session expirée" className="info-banner">
      <p>
        <Icon name="info" /> Ta session a expiré. <Link to={`/connexion?retour=${retour}`}>Se connecter</Link>
      </p>
      <button type="button" className="info-banner__close" onClick={close}>
        Fermer
      </button>
    </section>
  );
}
