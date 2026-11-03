import { canPropose } from '@acrofunjam/core';
import { useEffect } from 'react';
import { useSession } from '../identity/SessionContext';
import { CatalogPage } from './CatalogPage';

export function CatalogRoute() {
  const { session } = useSession();
  useEffect(() => {
    document.title = 'Catalogue des poses – AcroFunJam';
  }, []);
  // The site reasons on capabilities, never on the role (ADR 0019).
  return <CatalogPage canPropose={canPropose(session)} />;
}
