/** Paths of the pages of the site, shared by the routes (routes.tsx) and the links that lead to them. */
export const catalogPath = '/';

/** Form « Proposer une pose » (story 3), for a signed-in person only. */
export const proposePosePath = '/proposer-une-pose';

/** Page « Propositions à valider » (story 4), for validators and administrators only. */
export const validationPath = '/propositions-a-valider';

/** Page of a published pose (story 7), for every visitor: the pose and its transitions. */
export const posePagePattern = '/poses/:id';
export const posePath = (poseId: string): string => `/poses/${encodeURIComponent(poseId)}`;

/** Form « Proposer une transition » from a published pose (story 7), for a signed-in person only. */
export const transitionProposalPagePattern = '/poses/:id/proposer-une-transition';
export const transitionProposalPath = (poseId: string): string =>
  `${posePath(poseId)}/proposer-une-transition`;

/** Form « Proposer une modification » of a published pose (story 6), for a signed-in person only. */
export const revisionPagePattern = '/poses/:id/proposer-une-modification';
export const revisionPath = (poseId: string): string =>
  `/poses/${encodeURIComponent(poseId)}/proposer-une-modification`;

/** Page « Mes propositions » (story 5), for a signed-in person who may propose. */
export const myProposalsPath = '/mes-propositions';

export const signInPagePath = '/connexion';
export const registrationPagePath = '/inscription';

/** The sign-in page, coming back to `returnPath` afterwards (parameter « retour »). */
export const signInPath = (returnPath: string): string =>
  `${signInPagePath}?retour=${encodeURIComponent(returnPath)}`;
