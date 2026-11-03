import type { CatalogApi } from './catalog-api';
import type { ContributionApi } from './contribution-api';
import type { IdentityApi } from './identity-api';

export type SimulatedApis = {
  identityApi: IdentityApi;
  catalogApi: CatalogApi;
  contributionApi: ContributionApi;
};

/** AcroFunJam as a whole: every simulated API answers, or none does. */
export const setAcroFunJamReachable = (
  { identityApi, catalogApi, contributionApi }: SimulatedApis,
  reachable: boolean,
): void => {
  identityApi.setUnreachable(!reachable);
  catalogApi.setUnreachable(!reachable);
  contributionApi.setUnreachable(!reachable);
};

/**
 * Runs an action as it happened before the incidents of the scenario (outage, expired sessions), then brings
 * them back. "Alice est connectée…, la session d'Alice a expiré, quand Alice propose…": the incident happens
 * while the form is open, so the form is opened as it was before it (opening it afterwards would only lead to
 * the sign-in page, which is another scenario).
 */
export const beforeTheIncidents = async (apis: SimulatedApis, action: () => Promise<void>): Promise<void> => {
  const wasUnreachable = apis.identityApi.isUnreachable;
  const expired = apis.identityApi.restoreExpiredSessions();
  setAcroFunJamReachable(apis, true);
  try {
    await action();
  } finally {
    apis.identityApi.expireSessions(expired);
    setAcroFunJamReachable(apis, !wasUnreachable);
  }
};
