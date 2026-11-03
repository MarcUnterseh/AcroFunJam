/** Paths of the pages of the site, shared by the routes (routes.tsx) and the links that lead to them. */
export const catalogPath = '/';

/** Form « Proposer une pose » (story 3), for a signed-in person only. */
export const proposePosePath = '/proposer-une-pose';

export const signInPagePath = '/connexion';
export const registrationPagePath = '/inscription';

/** The sign-in page, coming back to `returnPath` afterwards (parameter « retour »). */
export const signInPath = (returnPath: string): string =>
  `${signInPagePath}?retour=${encodeURIComponent(returnPath)}`;
