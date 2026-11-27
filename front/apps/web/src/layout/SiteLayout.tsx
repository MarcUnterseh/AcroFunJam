import { type ReactNode } from 'react';
import { Outlet } from 'react-router';
import { SessionExpiredBanner } from '../identity/SessionExpiredBanner';
import { SessionProvider } from '../identity/SessionContext';
import { AnnouncerProvider } from './Announcer';
import { FocusOnNavigation } from './FocusOnNavigation';
import { SiteFooter } from './SiteFooter';
import { SiteHeader } from './SiteHeader';

/** Layout of every page: skip link, header, expiry banner, main content, footer, live region. */
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
        <SiteFooter />
        <FocusOnNavigation />
        {extra}
      </SessionProvider>
    </AnnouncerProvider>
  );
}
