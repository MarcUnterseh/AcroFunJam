const identityPages = ['/connexion', '/inscription'];

/**
 * Where to go back after signing in or registering: an internal path only ("/…"), never another site
 * ("//host", "/\host", "https://…"), so that the "retour" parameter cannot be used as an open redirect;
 * never an identity page either (a signed-in person would land on a form again).
 */
export const safeReturnPath = (raw: string | null): string => {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) return '/';
  const pathname = raw.split(/[?#]/)[0] ?? '';
  return identityPages.includes(pathname) ? '/' : raw;
};

/** The return path that links to the identity pages should carry, from the current location. */
export const returnPathFrom = (location: { readonly pathname: string; readonly search: string }): string =>
  identityPages.includes(location.pathname)
    ? safeReturnPath(new URLSearchParams(location.search).get('retour'))
    : location.pathname + location.search;
