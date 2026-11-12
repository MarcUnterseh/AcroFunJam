import { myProposalsLabels, proposalLabels, validationLabels } from '@acrofunjam/core';
import type { ReactNode } from 'react';
import type { RouteObject } from 'react-router';
import { CatalogRoute } from './catalog/CatalogRoute';
import { MyProposalsPage } from './contribution/MyProposalsPage';
import { ProposePosePage } from './contribution/ProposePosePage';
import { ValidationPage } from './contribution/ValidationPage';
import { RegisterPage, SignInPage } from './identity/IdentityPages';
import { NotFoundPage } from './layout/NotFoundPage';
import type { SiteRouteHandle } from './layout/route-handle';
import { SiteLayout } from './layout/SiteLayout';
import {
  myProposalsPath,
  proposePosePath,
  registrationPagePath,
  signInPagePath,
  validationPath,
} from './paths';

export { catalogPath, myProposalsPath, proposePosePath, validationPath } from './paths';

/** Why a person has to sign in, by page to go back to (line under the title of « Se connecter »). */
const signInContexts: Readonly<Record<string, string>> = {
  [proposePosePath]: proposalLabels.signInContext,
  [validationPath]: validationLabels.signInContext,
  [myProposalsPath]: myProposalsLabels.signInContext,
};

const ownSessionNotice: SiteRouteHandle = { ownSessionNotice: true };

/** Routes of the site (ADR 0010). "extra" lets tests render probes inside the router. */
export const routes = (extra?: ReactNode): RouteObject[] => [
  {
    element: <SiteLayout extra={extra} />,
    children: [
      { index: true, element: <CatalogRoute /> },
      { path: signInPagePath, element: <SignInPage contexts={signInContexts} />, handle: ownSessionNotice },
      { path: registrationPagePath, element: <RegisterPage />, handle: ownSessionNotice },
      { path: proposePosePath, element: <ProposePosePage />, handle: ownSessionNotice },
      { path: validationPath, element: <ValidationPage />, handle: ownSessionNotice },
      { path: myProposalsPath, element: <MyProposalsPage />, handle: ownSessionNotice },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];
