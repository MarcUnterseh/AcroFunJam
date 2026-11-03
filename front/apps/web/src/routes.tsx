import type { ReactNode } from 'react';
import type { RouteObject } from 'react-router';
import { CatalogRoute } from './catalog/CatalogRoute';
import { RegisterPage, SignInPage } from './identity/IdentityPages';
import { SiteLayout } from './layout/SiteLayout';

/** Routes of the site (ADR 0010). "extra" lets tests render probes inside the router. */
export const routes = (extra?: ReactNode): RouteObject[] => [
  {
    element: <SiteLayout extra={extra} />,
    children: [
      { index: true, element: <CatalogRoute /> },
      { path: 'connexion', element: <SignInPage /> },
      { path: 'inscription', element: <RegisterPage /> },
    ],
  },
];
