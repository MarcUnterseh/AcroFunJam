import { useEffect } from 'react';
import { CatalogPage } from './CatalogPage';

export function CatalogRoute() {
  useEffect(() => {
    document.title = 'Catalogue des poses – AcroFunJam';
  }, []);
  return (
    <>
      <h1 tabIndex={-1}>Catalogue des poses</h1>
      <CatalogPage />
    </>
  );
}
