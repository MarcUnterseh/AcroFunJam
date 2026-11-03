import type { CatalogApi } from './catalog-api';
import type { IdentityApi } from './identity-api';

/** AcroFunJam as a whole: every simulated API answers, or none does. */
export const setAcroFunJamReachable = (
  { identityApi, catalogApi }: { identityApi: IdentityApi; catalogApi: CatalogApi },
  reachable: boolean,
): void => {
  identityApi.setUnreachable(!reachable);
  catalogApi.setUnreachable(!reachable);
};
