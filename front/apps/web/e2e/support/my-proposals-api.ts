import type { BrowserContext, Route } from '@playwright/test';
import type { components } from '@acrofunjam/api-client/schema';
import type { CatalogApi } from './catalog-api';
import {
  poseFields,
  sameTagIds,
  type ContributionApi,
  type SubmittedTransition,
  type TransitionValues,
  type PoseValues,
  type SubmittedProposal,
  type SubmittedRevision,
} from './contribution-api';
import type { IdentityApi } from './identity-api';

type MyProposalsResponse = components['schemas']['MyProposalsResponse'];
type MyProposalResponse = components['schemas']['MyProposalResponse'];
type PoseAdjustmentsResponse = components['schemas']['PoseAdjustmentsResponse'];
type PoseChangesResponse = components['schemas']['PoseChangesResponse'];
type TransitionAdjustmentsResponse = components['schemas']['TransitionAdjustmentsResponse'];

const transitionFields = ['name', 'baseDifficulty', 'flyerDifficulty', 'description'] as const;

type NamedTags = Array<{ id: string; name: string }>;

/** Only the adjusted fields of a transition, with the proposed and the retained value; null when nothing differs. */
const transitionAdjustmentsOf = (
  proposed: TransitionValues,
  retained: TransitionValues,
  named: (ids: readonly string[]) => NamedTags,
): TransitionAdjustmentsResponse | null => {
  const adjusted = transitionFields.filter((field) => proposed[field] !== retained[field]);
  const [before, after] = [proposed.tagIds ?? [], retained.tagIds ?? []];
  const tagsAdjusted = before.length !== after.length || before.some((id) => !after.includes(id));
  if (adjusted.length === 0 && !tagsAdjusted) return null;
  const adjustment = <F extends (typeof transitionFields)[number]>(field: F) =>
    adjusted.includes(field) ? { proposed: proposed[field], retained: retained[field] } : null;
  return {
    name: adjustment('name'),
    baseDifficulty: adjustment('baseDifficulty') as TransitionAdjustmentsResponse['baseDifficulty'],
    flyerDifficulty: adjustment('flyerDifficulty') as TransitionAdjustmentsResponse['flyerDifficulty'],
    tags: tagsAdjusted ? { proposed: named(before), retained: named(after) } : null,
    description: adjustment('description'),
  };
};
type ProblemDetails = components['schemas']['ProblemDetails'];

/** Story 9a: names the tags of the poses, set by MyProposalsApi (the simulated list of tags of its catalog). */
let namedPoseTags: (ids: readonly string[]) => { id: string; name: string }[] = () => [];

/** Only the adjusted fields, with the proposed and the retained value; null when nothing differs. */
const adjustmentsOf = (proposed: PoseValues, retained: PoseValues): PoseAdjustmentsResponse | null => {
  const adjusted = poseFields.filter((field) => proposed[field] !== retained[field]);
  const tagsAdjusted = !sameTagIds(proposed.tagIds, retained.tagIds);
  if (adjusted.length === 0 && !tagsAdjusted) return null;
  const adjustment = <F extends (typeof poseFields)[number]>(field: F) =>
    adjusted.includes(field) ? { proposed: proposed[field], retained: retained[field] } : null;
  return {
    name: adjustment('name'),
    baseDifficulty: adjustment('baseDifficulty'),
    flyerDifficulty: adjustment('flyerDifficulty'),
    canStartFlow: adjustment('canStartFlow'),
    canEndFlow: adjustment('canEndFlow'),
    tags: tagsAdjusted
      ? { proposed: namedPoseTags(proposed.tagIds ?? []), retained: namedPoseTags(retained.tagIds ?? []) }
      : null,
  };
};

const poseOf = ({ name, baseDifficulty, flyerDifficulty, canStartFlow, canEndFlow, tagIds }: PoseValues) => ({
  name,
  baseDifficulty,
  flyerDifficulty,
  canStartFlow,
  canEndFlow,
  tags: namedPoseTags(tagIds ?? []),
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
    tags: sameTagIds(before.tagIds, after.tagIds)
      ? null
      : { before: namedPoseTags(before.tagIds ?? []), after: namedPoseTags(after.tagIds ?? []) },
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

/** A transition as GET /contribution/my-proposals presents it (story 7): its poses under their current names. */
const toTransitionResponse = (
  catalogApi: CatalogApi,
  transition: SubmittedTransition,
): MyProposalResponse => {
  const { id, submittedAt, decision } = transition;
  const from = catalogApi.poseWithId(transition.fromPoseId)!;
  const to = catalogApi.poseWithId(transition.toPoseId)!;
  const proposed: TransitionValues = {
    name: transition.name,
    baseDifficulty: transition.baseDifficulty,
    flyerDifficulty: transition.flyerDifficulty,
    description: transition.description,
    tagIds: transition.tagIds ?? [],
  };
  const named = (ids: readonly string[]) =>
    catalogApi.tags.describe(ids).map((tag) => ({ id: tag.id, name: tag.name }));
  const presented = ({ tagIds = [], ...values }: TransitionValues) => ({ ...values, tags: named(tagIds) });
  const common = {
    kind: 'transition-proposal' as const,
    id,
    fromPose: { id: from.id, name: from.name },
    toPose: { id: to.id, name: to.name },
    submittedAt,
    ...none,
  };
  switch (decision?.kind) {
    case undefined:
      return { ...common, status: 'pending', ...presented(proposed) };
    case 'published-directly':
      return { ...common, status: 'published-directly', ...presented(proposed) };
    case 'rejected':
      return {
        ...common,
        status: 'rejected',
        ...presented(proposed),
        decidedAt: decision.decidedAt,
        reason: decision.reason,
      };
    case 'accepted': {
      const adjustments = transitionAdjustmentsOf(proposed, decision.retained, named);
      return {
        ...common,
        status: adjustments ? 'accepted-with-adjustments' : 'accepted',
        ...presented(decision.retained),
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
    private readonly catalogApi: CatalogApi,
  ) {
    namedPoseTags = (ids) => catalogApi.tags.describe(ids).map(({ id, name }) => ({ id, name }));
  }

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
      ...this.contributionApi.transitions
        .filter((transition) => mine(transition.contributorEmail))
        .map((transition) => ({
          submittedAt: transition.submittedAt,
          item: toTransitionResponse(this.catalogApi, transition),
        })),
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
