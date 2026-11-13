import type { BrowserContext, Route } from '@playwright/test';
import type { components } from '@acrofunjam/api-client/schema';
import {
  poseFields,
  type ContributionApi,
  type PoseValues,
  type SubmittedProposal,
  type SubmittedRevision,
} from './contribution-api';
import type { IdentityApi } from './identity-api';

type MyProposalsResponse = components['schemas']['MyProposalsResponse'];
type MyProposalResponse = components['schemas']['MyProposalResponse'];
type PoseAdjustmentsResponse = components['schemas']['PoseAdjustmentsResponse'];
type PoseChangesResponse = components['schemas']['PoseChangesResponse'];
type ProblemDetails = components['schemas']['ProblemDetails'];

/** Only the adjusted fields, with the proposed and the retained value; null when nothing differs. */
const adjustmentsOf = (proposed: PoseValues, retained: PoseValues): PoseAdjustmentsResponse | null => {
  const adjusted = poseFields.filter((field) => proposed[field] !== retained[field]);
  if (adjusted.length === 0) return null;
  const adjustment = <F extends (typeof poseFields)[number]>(field: F) =>
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

const none = { decidedAt: null, adjustments: null, message: null, reason: null };

/** A pose proposal as GET /contribution/my-proposals presents it to its contributor (never the validator). */
const toPoseProposalResponse = (proposal: SubmittedProposal): MyProposalResponse => {
  const { id, submittedAt, decision } = proposal;
  const kind = 'pose-proposal' as const;
  switch (decision?.kind) {
    case undefined:
      return { kind, id, status: 'pending', ...poseOf(proposal), submittedAt, ...none };
    case 'published-directly':
      return { kind, id, status: 'published-directly', ...poseOf(proposal), submittedAt, ...none };
    case 'rejected':
      return {
        kind,
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
        kind,
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

/** The fields that change in the pose, before → after (the retained values once accepted, the proposed ones otherwise). */
const changesOf = (before: PoseValues, after: PoseValues): PoseChangesResponse => {
  const change = <F extends (typeof poseFields)[number]>(field: F) =>
    before[field] === after[field] ? null : { before: before[field], after: after[field] };
  return {
    name: change('name'),
    baseDifficulty: change('baseDifficulty'),
    flyerDifficulty: change('flyerDifficulty'),
    canStartFlow: change('canStartFlow'),
    canEndFlow: change('canEndFlow'),
  };
};

/** A revision as GET /contribution/my-proposals presents it (story 6): the pose by its name when proposed. */
const toRevisionResponse = (revision: SubmittedRevision): MyProposalResponse => {
  const { id, submittedAt, decision, before } = revision;
  const proposed = { ...before, ...revision.changes };
  const common = { kind: 'pose-revision' as const, id, poseName: before.name, submittedAt, ...none };
  switch (decision?.kind) {
    case undefined:
      return { ...common, status: 'pending', changes: changesOf(before, proposed) };
    case 'published-directly':
      return { ...common, status: 'published-directly', changes: changesOf(before, proposed) };
    case 'rejected':
      return {
        ...common,
        status: 'rejected',
        changes: changesOf(before, proposed),
        decidedAt: decision.decidedAt,
        reason: decision.reason,
      };
    case 'accepted': {
      const adjustments = adjustmentsOf(proposed, decision.retained);
      return {
        ...common,
        status: adjustments ? 'accepted-with-adjustments' : 'accepted',
        changes: changesOf(before, decision.retained),
        decidedAt: decision.decidedAt,
        adjustments,
        message: adjustments ? decision.message : null,
      };
    }
  }
};

/**
 * Simulated « Mes propositions » of the Contribution API (ADR 0023, ADR 0027): GET /contribution/my-proposals, the
 * pose proposals and the revisions of the requester only, the most recently submitted first; an accepted proposal
 * presents the retained pose. 401 without a valid session. Shares the proposals and the reachability of the
 * simulated Contribution API (one API). The rules themselves are checked by the @api scenarios.
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
    await this.context.route('**/contribution/my-proposals', (route) => this.list(route));
  }

  private async list(route: Route): Promise<void> {
    this.requests += 1;
    if (this.contributionApi.isUnreachable) return route.abort('connectionrefused');
    const account = this.identityApi.accountOf(route);
    if (!account) return this.problem(route, 401, 'Unauthorized');
    const requester = account.email.toLowerCase();
    const mine = (contributorEmail: string) => contributorEmail.toLowerCase() === requester;
    const items = [
      ...this.contributionApi.submitted
        .filter((proposal) => mine(proposal.contributorEmail))
        .map((proposal) => ({ submittedAt: proposal.submittedAt, item: toPoseProposalResponse(proposal) })),
      ...this.contributionApi.revisions
        .filter((revision) => mine(revision.contributorEmail))
        .map((revision) => ({ submittedAt: revision.submittedAt, item: toRevisionResponse(revision) })),
    ];
    const body: MyProposalsResponse = {
      proposals: items.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)).map(({ item }) => item),
    };
    return route.fulfill({ json: body });
  }

  private problem(route: Route, status: number, title: string) {
    const body: ProblemDetails = { title, status };
    return route.fulfill({ status, contentType: 'application/problem+json', body: JSON.stringify(body) });
  }
}
