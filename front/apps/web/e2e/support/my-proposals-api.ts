import type { BrowserContext, Route } from '@playwright/test';
import type { components } from '@acrofunjam/api-client/schema';
import type { ContributionApi, PoseValues, SubmittedProposal } from './contribution-api';
import type { IdentityApi } from './identity-api';

type MyPoseProposalsResponse = components['schemas']['MyPoseProposalsResponse'];
type MyPoseProposalResponse = components['schemas']['MyPoseProposalResponse'];
type PoseAdjustmentsResponse = components['schemas']['PoseAdjustmentsResponse'];
type ProblemDetails = components['schemas']['ProblemDetails'];

const fields = ['name', 'baseDifficulty', 'flyerDifficulty', 'canStartFlow', 'canEndFlow'] as const;

/** Only the adjusted fields, with the proposed and the retained value; null when nothing differs. */
const adjustmentsOf = (proposed: PoseValues, retained: PoseValues): PoseAdjustmentsResponse | null => {
  const adjusted = fields.filter((field) => proposed[field] !== retained[field]);
  if (adjusted.length === 0) return null;
  const adjustment = <F extends (typeof fields)[number]>(field: F) =>
    adjusted.includes(field) ? { proposed: proposed[field], retained: retained[field] } : null;
  return {
    name: adjustment('name'),
    baseDifficulty: adjustment('baseDifficulty'),
    flyerDifficulty: adjustment('flyerDifficulty'),
    canStartFlow: adjustment('canStartFlow'),
    canEndFlow: adjustment('canEndFlow'),
  };
};

const poseOf = ({ name, baseDifficulty, flyerDifficulty, canStartFlow, canEndFlow }: PoseValues) => ({
  name,
  baseDifficulty,
  flyerDifficulty,
  canStartFlow,
  canEndFlow,
});

/** A proposal as GET /contribution/my-pose-proposals presents it to its contributor (never the validator). */
const toResponse = (proposal: SubmittedProposal): MyPoseProposalResponse => {
  const { id, submittedAt, decision } = proposal;
  const none = { decidedAt: null, adjustments: null, message: null, reason: null };
  switch (decision?.kind) {
    case undefined:
      return { id, status: 'pending', ...poseOf(proposal), submittedAt, ...none };
    case 'published-directly':
      return { id, status: 'published-directly', ...poseOf(proposal), submittedAt, ...none };
    case 'rejected':
      return {
        id,
        status: 'rejected',
        ...poseOf(proposal),
        submittedAt,
        ...none,
        decidedAt: decision.decidedAt,
        reason: decision.reason,
      };
    case 'accepted': {
      const adjustments = adjustmentsOf(proposal, decision.retained);
      return {
        id,
        status: adjustments ? 'accepted-with-adjustments' : 'accepted',
        ...poseOf(decision.retained),
        submittedAt,
        ...none,
        decidedAt: decision.decidedAt,
        adjustments,
        message: adjustments ? decision.message : null,
      };
    }
  }
};

/**
 * Simulated « Mes propositions » of the Contribution API (ADR 0023): GET /contribution/my-pose-proposals, the
 * proposals of the requester only, the most recently submitted first; an accepted proposal presents the retained
 * pose. 401 without a valid session. Shares the proposals and the reachability of the simulated Contribution
 * API (one API). The rules themselves are checked by the @api scenarios.
 */
export class MyProposalsApi {
  /** How many times the site asked for the proposals of the requester. */
  requests = 0;

  constructor(
    private readonly context: BrowserContext,
    private readonly identityApi: IdentityApi,
    private readonly contributionApi: ContributionApi,
  ) {}

  async start(): Promise<void> {
    await this.context.route('**/contribution/my-pose-proposals', (route) => this.list(route));
  }

  private async list(route: Route): Promise<void> {
    this.requests += 1;
    if (this.contributionApi.isUnreachable) return route.abort('connectionrefused');
    const account = this.identityApi.accountOf(route);
    if (!account) return this.problem(route, 401, 'Unauthorized');
    const requester = account.email.toLowerCase();
    const body: MyPoseProposalsResponse = {
      proposals: this.contributionApi.submitted
        .filter((proposal) => proposal.contributorEmail.toLowerCase() === requester)
        .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
        .map(toResponse),
    };
    return route.fulfill({ json: body });
  }

  private problem(route: Route, status: number, title: string) {
    const body: ProblemDetails = { title, status };
    return route.fulfill({ status, contentType: 'application/problem+json', body: JSON.stringify(body) });
  }
}
