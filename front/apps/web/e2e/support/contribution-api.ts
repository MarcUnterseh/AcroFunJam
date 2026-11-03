import type { BrowserContext, Route } from '@playwright/test';
import type { components } from '@acrofunjam/api-client/schema';
import type { CatalogApi, DifficultyCode } from './catalog-api';
import type { IdentityApi } from './identity-api';

type ProposePoseRequest = components['schemas']['ProposePoseRequest'];
type PoseProposalResponse = components['schemas']['PoseProposalResponse'];
type ProblemDetails = components['schemas']['ProblemDetails'];

/** Same normalisation and comparison key as the API (ADR 0017), enough for the scenarios of the site. */
const normalised = (name: string) => name.normalize('NFC').split(/\s+/u).filter(Boolean).join(' ');
const keyOf = (name: string) =>
  normalised(name)
    .normalize('NFD')
    .replace(/\p{Mn}/gu, '')
    .replace(/[^\p{L}\p{Nd}]/gu, ' ')
    .split(' ')
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

/**
 * Simulated Contribution API (ADR 0006, ADR 0018): POST /contribution/pose-proposals. The status depends on the
 * role of the account whose session cookie the request carries: a user's proposal is pending, a validator's or
 * an administrator's is accepted and published at once in the simulated catalog. 401 without a valid session,
 * 409 when the name is taken. The content rules are checked by the @api scenarios, not here.
 */
export class ContributionApi {
  private readonly pending: string[] = [];
  private unreachable = false;
  /** Proposals received, as sent by the site. */
  readonly received: ProposePoseRequest[] = [];

  constructor(
    private readonly context: BrowserContext,
    private readonly identityApi: IdentityApi,
    private readonly catalogApi: CatalogApi,
  ) {}

  setUnreachable(unreachable: boolean): void {
    this.unreachable = unreachable;
  }

  async start(): Promise<void> {
    await this.context.route('**/contribution/pose-proposals', (route) => this.propose(route));
  }

  private async propose(route: Route): Promise<void> {
    if (this.unreachable) return route.abort('connectionrefused');
    const account = this.identityApi.accountOf(route);
    if (!account) return this.problem(route, 401, 'Unauthorized');

    const request = route.request().postDataJSON() as ProposePoseRequest;
    this.received.push(request);
    const name = normalised(request.name ?? '');
    const key = keyOf(name);
    if (this.catalogApi.publishedNames.some((published) => keyOf(published) === key))
      return this.problem(route, 409, 'contribution.pose-name-already-in-catalog');
    if (this.pending.some((proposed) => keyOf(proposed) === key))
      return this.problem(route, 409, 'contribution.pose-name-already-pending');

    const proposal: PoseProposalResponse = {
      id: crypto.randomUUID(),
      status: account.role === 'user' ? 'pending' : 'accepted',
      name,
      baseDifficulty: request.baseDifficulty as DifficultyCode,
      flyerDifficulty: request.flyerDifficulty as DifficultyCode,
      canStartFlow: request.canStartFlow ?? false,
      canEndFlow: request.canEndFlow ?? false,
    };
    if (proposal.status === 'pending') this.pending.push(name);
    else
      this.catalogApi.publish({
        name,
        baseDifficulty: proposal.baseDifficulty,
        flyerDifficulty: proposal.flyerDifficulty,
        canStartFlow: proposal.canStartFlow,
        canEndFlow: proposal.canEndFlow,
      });
    return route.fulfill({ status: 201, json: proposal });
  }

  private problem(route: Route, status: number, title: string) {
    const body: ProblemDetails = { title, status };
    return route.fulfill({ status, contentType: 'application/problem+json', body: JSON.stringify(body) });
  }
}
