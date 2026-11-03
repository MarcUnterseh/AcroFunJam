import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router';
import { returnPathFrom } from '../identity/return-path';
import { useSession } from '../identity/SessionContext';
import { useAnnounce } from './Announcer';

/** Site header (docs/design/composants/en-tete.md): the account area keeps its size in its three states. */
export function SiteHeader() {
  const { session, signOut } = useSession();
  const location = useLocation();
  const announce = useAnnounce();
  const retour = encodeURIComponent(returnPathFrom(location));
  const signInLink = useRef<HTMLAnchorElement>(null);
  const [focusSignIn, setFocusSignIn] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  // The sign-out button disappears while focused: give the focus to "Se connecter" instead.
  useEffect(() => {
    if (focusSignIn && session.status === 'visitor') {
      signInLink.current?.focus();
      setFocusSignIn(false);
    }
  }, [focusSignIn, session.status]);

  const onSignOut = async () => {
    setSigningOut(true);
    const result = await signOut();
    setSigningOut(false);
    announce(result.ok ? 'Déconnexion effectuée.' : "La déconnexion n'a pas pu aboutir. Réessaie.");
    if (result.ok) setFocusSignIn(true);
  };

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link to="/" className="site-header__brand">
          AcroFunJam
        </Link>
        <nav
          aria-label="Compte"
          className="site-header__account"
          aria-busy={session.status === 'checking' || undefined}
        >
          {session.status === 'visitor' && (
            <>
              <NavLink
                ref={signInLink}
                to={`/connexion?retour=${retour}`}
                className="button button--secondary"
              >
                Se connecter
              </NavLink>
              <NavLink to={`/inscription?retour=${retour}`} className="button button--primary">
                S'inscrire
              </NavLink>
            </>
          )}
          {session.status === 'signedIn' && (
            <>
              <span className="site-header__email" title={session.email}>
                <span className="visually-hidden">Compte connecté : </span>
                {session.email}
              </span>
              <button
                type="button"
                className="button button--secondary"
                aria-disabled={signingOut || undefined}
                onClick={() => void (signingOut ? undefined : onSignOut())}
              >
                {signingOut ? 'Déconnexion…' : 'Se déconnecter'}
              </button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
