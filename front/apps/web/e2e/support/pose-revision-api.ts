import type { BrowserContext, Route } from '@playwright/test';
import type { components } from '@acrofunjam/api-client/schema';
import type { CatalogApi, DifficultyCode } from './catalog-api';
import { keyOf, normalised, poseFields, type ContributionApi, type PoseChanges } from './contribution-api';
import type { IdentityApi } from './identity-api';

type ProposePoseRevisionRequest = components['schemas']['ProposePoseRevisionRequest'];
type PoseRevisionProposalResponse = components['schemas']['PoseRevisionProposalResponse'];
type PendingRevisionOfPoseResponse = components['schemas']['PendingRevisionOfPoseResponse'];
type ProblemDetails = components['schemas']['ProblemDetails'];

/**
 * Simulated revision proposals of the Contribution API (story 6, ADR 0024 to 0027): POST
 * /contribution/pose-revision-proposals and GET /contribution/pose-revision-proposals/pending?poseId=…. A user's revision
 * is pending; a validator's or an administrator's is published at once in the simulated catalog. Same statuses and codes
 * as the API: 401 without a valid session, 404 unknown pose, 409 pose changed meanwhile, revision already pending or
 * name taken, 422 a revision that changes nothing. Shares the revisions and the reachability of the simulated
 * Contribution API (one API). The rules themselves are checked by the @api scenarios.
 */
export class PoseRevisionApi {
  /** Revision proposals received, as sent by the site. */
  readonly received: ProposePoseRevisionRequest[] = [];

  constructor(
    private readonly context: BrowserContext,
    private readonly identityApi: IdentityApi,
    private readonly catalogApi: CatalogApi,
    private readonly contributionApi: ContributionApi,
  ) {}

  async start(): Promise<void> {
    await this.context.route('**/contribution/pose-revision-proposals', (route) =>
      this.handle(route, () => this.propose(route)),
    );
    await this.context.route('**/contribution/pose-revision-proposals/pending?*', (route) =>
      this.handle(route, () => this.pendingRevision(route)),
    );
  }

  private async handle(route: Route, answer: () => Promise<void>): Promise<void> {
    if (this.contributionApi.isUnreachable) return route.abort('connectionrefused');
    if (!this.identityApi.accountOf(route)) return this.problem(route, 401, 'Unauthorized');
    return answer();
  }

  private async pendingRevision(route: Route): Promise<void> {
    const requester = this.identityApi.accountOf(route)!.email.toLowerCase();
    const poseId = new URL(route.request().url()).searchParams.get('poseId');
    const pending = this.contributionApi.pendingRevisions.find((revision) => revision.poseId === poseId);
    const body: PendingRevisionOfPoseResponse = {
      pendingRevision: pending ? { isYours: pending.contributorEmail.toLowerCase() === requester } : null,
    };
    return route.fulfill({ json: body });
  }

  private async propose(route: Route): Promise<void> {
    const account = this.identityApi.accountOf(route)!;
    const request = route.request().postDataJSON() as ProposePoseRevisionRequest;
    this.received.push(request);
    const pose = this.catalogApi.poseWithId(request.poseId);
    if (!pose) return this.problem(route, 404, 'contribution.pose-not-found');
    if (Number(request.poseVersion) !== Number(pose.version))
      return this.problem(route, 409, 'contribution.pose-changed-since-revision-started');

    const proposed: PoseChanges = {
      ...(request.name != null && { name: normalised(request.name) }),
      ...(request.baseDifficulty != null && { baseDifficulty: request.baseDifficulty as DifficultyCode }),
      ...(request.flyerDifficulty != null && { flyerDifficulty: request.flyerDifficulty as DifficultyCode }),
      ...(request.canStartFlow != null && { canStartFlow: request.canStartFlow }),
      ...(request.canEndFlow != null && { canEndFlow: request.canEndFlow }),
    };
    const changes = Object.fromEntries(
      poseFields
        .filter((field) => proposed[field] !== undefined && proposed[field] !== pose[field])
        .map((field) => [field, proposed[field]]),
    ) as PoseChanges;
    if (Object.keys(changes).length === 0)
      return this.problem(route, 422, 'contribution.revision-changes-nothing');
    // As the domain does: a revision that changes nothing is refused before the pending one is looked for.
    if (this.contributionApi.pendingRevisions.some((revision) => revision.poseId === pose.id))
      return this.problem(route, 409, 'contribution.pose-revision-already-pending');
    if (changes.name !== undefined && keyOf(changes.name) !== keyOf(pose.name)) {
      const key = keyOf(changes.name);
      if (this.catalogApi.publishedNames.some((published) => keyOf(published) === key))
        return this.problem(route, 409, 'contribution.pose-name-already-in-catalog');
      if (this.contributionApi.isNamePending(changes.name))
        return this.problem(route, 409, 'contribution.pose-name-already-pending');
    }

    const { id: poseId, name, baseDifficulty, flyerDifficulty, canStartFlow, canEndFlow } = pose;
    const before = { name, baseDifficulty, flyerDifficulty, canStartFlow, canEndFlow };
    const directly = account.role !== 'user';
    const message = (request.message ?? '').split(/\s+/u).filter(Boolean).join(' ') || null;
    const revision = this.contributionApi.addRevision(
      { poseId, before, changes, message, contributorEmail: account.email },
      directly,
    );
    const revised = { ...before, ...changes };
    const answer: PoseRevisionProposalResponse = {
      id: revision.id,
      status: directly ? 'accepted' : 'pending',
      poseId,
      ...revised,
    };
    return route.fulfill({ status: 201, json: answer });
  }

  private problem(route: Route, status: number, title: string) {
    const body: ProblemDetails = { title, status };
    return route.fulfill({ status, contentType: 'application/problem+json', body: JSON.stringify(body) });
  }
}
