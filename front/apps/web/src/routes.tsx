import {
  myProposalsLabels,
  proposalLabels,
  revisionLabels,
  transitionProposalLabels,
  validationLabels,
} from '@acrofunjam/core';
import type { ReactNode } from 'react';
import { matchPath, type RouteObject } from 'react-router';
import { AddPhotoPage } from './catalog/AddPhotoPage';
import { CatalogRoute } from './catalog/CatalogRoute';
import { PosePageRoute } from './catalog/PosePageRoute';
import { TagsPage } from './catalog/TagsPage';
import { FlowGeneratorPage } from './flow-generation/FlowGeneratorPage';
import { MyProposalsPage } from './contribution/MyProposalsPage';
import { ProposePosePage } from './contribution/ProposePosePage';
import { ProposeRevisionPage } from './contribution/ProposeRevisionPage';
import { ProposeTransitionPage } from './contribution/ProposeTransitionPage';
import { ValidationPage } from './contribution/ValidationPage';
import { RegisterPage, SignInPage } from './identity/IdentityPages';
import { NotFoundPage } from './layout/NotFoundPage';
import type { SiteRouteHandle } from './layout/route-handle';
import { SiteLayout } from './layout/SiteLayout';
import {
  addPhotoPagePattern,
  flowGeneratorPath,
  myProposalsPath,
  posePagePattern,
  proposePosePath,
  registrationPagePath,
  revisionPagePattern,
  signInPagePath,
  tagsPath,
  transitionProposalPagePattern,
  validationPath,
} from './paths';

export { catalogPath, myProposalsPath, proposePosePath, validationPath } from './paths';

/** Why a person has to sign in, by page to go back to (line under the title of « Se connecter »). */
const signInContexts: Readonly<Record<string, string>> = {
  [proposePosePath]: proposalLabels.signInContext,
  [validationPath]: validationLabels.signInContext,
  [myProposalsPath]: myProposalsLabels.signInContext,
};

/** The forms of a pose (stories 6 and 7), by the pattern of their path. */
const poseFormContexts: ReadonlyArray<readonly [string, string]> = [
  [revisionPagePattern, revisionLabels.signInContext],
  [transitionProposalPagePattern, transitionProposalLabels.signInContext],
];

const signInContextOf = (returnPath: string): string | undefined => {
  const pathname = returnPath.split(/[?#]/)[0] ?? '';
  return (
    signInContexts[returnPath] ?? poseFormContexts.find(([pattern]) => matchPath(pattern, pathname))?.[1]
  );
};

const ownSessionNotice: SiteRouteHandle = { ownSessionNotice: true };

/** Routes of the site (ADR 0010). "extra" lets tests render probes inside the router. */
export const routes = (extra?: ReactNode): RouteObject[] => [
  {
    element: <SiteLayout extra={extra} />,
    children: [
      { index: true, element: <CatalogRoute /> },
      { path: posePagePattern, element: <PosePageRoute /> },
      { path: addPhotoPagePattern, element: <AddPhotoPage />, handle: ownSessionNotice },
      { path: tagsPath, element: <TagsPage /> },
      { path: flowGeneratorPath, element: <FlowGeneratorPage /> },
      { path: signInPagePath, element: <SignInPage contextOf={signInContextOf} />, handle: ownSessionNotice },
      { path: registrationPagePath, element: <RegisterPage />, handle: ownSessionNotice },
      { path: proposePosePath, element: <ProposePosePage />, handle: ownSessionNotice },
      { path: revisionPagePattern, element: <ProposeRevisionPage />, handle: ownSessionNotice },
      { path: transitionProposalPagePattern, element: <ProposeTransitionPage />, handle: ownSessionNotice },
      { path: validationPath, element: <ValidationPage />, handle: ownSessionNotice },
      { path: myProposalsPath, element: <MyProposalsPage />, handle: ownSessionNotice },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];
