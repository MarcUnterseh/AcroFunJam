import { useEffect, useRef, type ReactNode } from 'react';
import { Outlet, useLocation } from 'react-router';
import { SessionExpiredBanner } from '../identity/SessionExpiredBanner';
import { SessionProvider } from '../identity/SessionContext';
import { AnnouncerProvider } from './Announcer';
import { focusPageTitle } from './focus';
import { SiteHeader } from './SiteHeader';

/** After each navigation (not on the first display), the focus goes to the new page's title. */
function FocusOnNavigation() {
  const { pathname } = useLocation();
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    focusPageTitle();
  }, [pathname]);
  return null;
}

/** Layout of every page: skip link, header, expiry banner, main content, live region. */
export function SiteLayout({ extra }: { readonly extra?: ReactNode }) {
  return (
    <AnnouncerProvider>
      <SessionProvider>
        <a href="#contenu" className="skip-link">
          Aller au contenu
        </a>
        <SiteHeader />
        <SessionExpiredBanner />
        <main id="contenu" tabIndex={-1}>
          <Outlet />
        </main>
        <FocusOnNavigation />
        {extra}
      </SessionProvider>
    </AnnouncerProvider>
  );
}
