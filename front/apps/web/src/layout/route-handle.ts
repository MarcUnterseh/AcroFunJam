import { useMatches } from 'react-router';

/**
 * What a route tells the layout (react-router "handle"), set by routes.tsx: the identity and layout code
 * never needs to know the pages of the other contexts.
 */
export type SiteRouteHandle = {
  /** The page tells an expired session itself (its own alert, or the sign-in form): no global banner. */
  readonly ownSessionNotice?: boolean;
};

/** Whether one of the routes of the current page sets the given flag. */
export const useRouteFlag = (flag: keyof SiteRouteHandle): boolean =>
  useMatches().some((match) => Boolean((match.handle as SiteRouteHandle | undefined)?.[flag]));
