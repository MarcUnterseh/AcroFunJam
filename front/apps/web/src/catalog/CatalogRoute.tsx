import { useEffect } from 'react';
import { useSession } from '../identity/SessionContext';
import { CatalogPage } from './CatalogPage';

export function CatalogRoute() {
  const { session } = useSession();
  useEffect(() => {
    document.title = 'Catalogue des poses – AcroFunJam';
  }, []);
  // The site reasons on capabilities, never on the role (ADR 0019).
  const canPropose = session.status === 'signedIn' && session.capabilities.includes('propose');
  return <CatalogPage canPropose={canPropose} />;
}
