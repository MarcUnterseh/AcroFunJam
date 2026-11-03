import type { ReactNode } from 'react';
import type { RouteObject } from 'react-router';
import { CatalogRoute } from './catalog/CatalogRoute';
import { RegisterPage, SignInPage } from './identity/IdentityPages';
import { NotFoundPage } from './layout/NotFoundPage';
import { SiteLayout } from './layout/SiteLayout';
import { proposePosePath } from './paths';

export { catalogPath, proposePosePath } from './paths';

/** Routes of the site (ADR 0010). "extra" lets tests render probes inside the router. */
export const routes = (extra?: ReactNode): RouteObject[] => [
  {
    element: <SiteLayout extra={extra} />,
    children: [
      { index: true, element: <CatalogRoute /> },
      { path: 'connexion', element: <SignInPage /> },
      { path: 'inscription', element: <RegisterPage /> },
      // Story 3, step C: the "Proposer une pose" form. Until then, the fallback answers this address.
      { path: proposePosePath, element: <NotFoundPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];
