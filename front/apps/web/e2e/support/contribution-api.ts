import type { BrowserContext, Route } from '@playwright/test';
import type { components } from '@acrofunjam/api-client/schema';
import type { CatalogApi, DifficultyCode } from './catalog-api';
import type { IdentityApi } from './identity-api';

type ProposePoseRequest = components['schemas']['ProposePoseRequest'];
type PoseProposalResponse = components['schemas']['PoseProposalResponse'];
type ProblemDetails = components['schemas']['ProblemDetails'];

/** A proposal pending validation, as the simulated API keeps it (story 4 reads it from the validation queue). */
export type PendingProposal = {
  id: string;
  name: string;
  baseDifficulty: DifficultyCode;
  flyerDifficulty: DifficultyCode;
  canStartFlow: boolean;
  canEndFlow: boolean;
  contributorEmail: string;
  submittedAt: string;
};

/** The values of a pose, as the API returns them. */
export type PoseValues = Pick<
  PendingProposal,
  'name' | 'baseDifficulty' | 'flyerDifficulty' | 'canStartFlow' | 'canEndFlow'
>;

/** What became of a proposal (story 5 reads it from « Mes propositions »); null while pending. */
export type ProposalDecision =
  | { kind: 'accepted'; retained: PoseValues; message: string | null; decidedAt: string }
  | { kind: 'rejected'; reason: string; decidedAt: string }
  | { kind: 'published-directly' };

/** A proposal as the simulated API keeps it, pending or decided. */
export type SubmittedProposal = PendingProposal & { decision: ProposalDecision | null };

/** The fields a revision changes, with their proposed value (story 6); an absent field keeps its value. */
export type PoseChanges = Partial<PoseValues>;

/** A revision proposal as the simulated API keeps it, pending or decided (story 6). */
export type SubmittedRevision = {
  id: string;
  poseId: string;
  /** The pose when the revision was proposed (« valeur d'avant »). */
  before: PoseValues;
  changes: PoseChanges;
  message: string | null;
  contributorEmail: string;
  submittedAt: string;
  decision: ProposalDecision | null;
};

export const poseFields = ['name', 'baseDifficulty', 'flyerDifficulty', 'canStartFlow', 'canEndFlow'] as const;

/** Same normalisation and comparison key as the API (ADR 0017), enough for the scenarios of the site. */
export const normalised = (name: string) => name.normalize('NFC').split(/\s+/u).filter(Boolean).join(' ');
export const keyOf = (name: string) =>
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
  /** Proposals pending validation, the oldest first (shared with the simulated validation API). */
  readonly pending: PendingProposal[] = [];
  /** Every proposal received, pending, decided or published directly, in the order of submission. */
  readonly submitted: SubmittedProposal[] = [];
  /** Every revision proposal received (story 6), in the order of submission. */
  readonly revisions: SubmittedRevision[] = [];
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

  get isUnreachable(): boolean {
    return this.unreachable;
  }

  /** A proposal pending validation, made before the scenario (« Alice a proposé la pose … »). */
  addPending(proposal: Omit<PendingProposal, 'id' | 'submittedAt'>): PendingProposal {
    const pending = this.submit(proposal, null);
    this.pending.push(pending);
    return pending;
  }

  /** A pose proposed by a validator or an administrator: published at once (glossary « Publication directe »). */
  addDirectPublication(proposal: Omit<PendingProposal, 'id' | 'submittedAt'>): void {
    this.submit(proposal, { kind: 'published-directly' });
    const { name, baseDifficulty, flyerDifficulty, canStartFlow, canEndFlow } = proposal;
    this.catalogApi.publish({ name, baseDifficulty, flyerDifficulty, canStartFlow, canEndFlow });
  }

  private submit(
    proposal: Omit<PendingProposal, 'id' | 'submittedAt'>,
    decision: ProposalDecision | null,
  ): PendingProposal {
    const submitted = { ...proposal, id: crypto.randomUUID(), submittedAt: this.nextSubmissionDate() };
    this.submitted.push({ ...submitted, decision });
    return submitted;
  }

  /** One day apart, from 1 November 2026, proposals and revisions alike: the queue presents the oldest first. */
  private nextSubmissionDate(): string {
    const count = this.submitted.length + this.revisions.length;
    return new Date(Date.UTC(2026, 10, 1 + count, 9)).toISOString();
  }

  /**
   * A revision proposal of a published pose (« Alice a proposé de modifier la pose … »): pending, or published at
   * once in the simulated catalog for a validator or an administrator (story 6).
   */
  addRevision(
    revision: Pick<SubmittedRevision, 'poseId' | 'before' | 'changes' | 'message' | 'contributorEmail'>,
    directly: boolean,
  ): SubmittedRevision {
    const submitted: SubmittedRevision = {
      ...revision,
      id: crypto.randomUUID(),
      submittedAt: this.nextSubmissionDate(),
      decision: directly ? { kind: 'published-directly' } : null,
    };
    this.revisions.push(submitted);
    if (directly) this.catalogApi.revise(revision.poseId, revision.changes);
    return submitted;
  }

  get pendingRevisions(): readonly SubmittedRevision[] {
    return this.revisions.filter((revision) => revision.decision === null);
  }

  /** The revision was decided: it leaves the queue, and its contributor will see the decision. */
  decideRevision(id: string, decision: ProposalDecision): void {
    const revision = this.revisions.find((submitted) => submitted.id === id);
    if (revision) revision.decision = decision;
  }

  /** The proposal was decided: it leaves the queue, and its contributor will see the decision. */
  decide(id: string, decision: ProposalDecision): void {
    const index = this.pending.findIndex((proposal) => proposal.id === id);
    if (index >= 0) this.pending.splice(index, 1);
    const submitted = this.submitted.find((proposal) => proposal.id === id);
    if (submitted) submitted.decision = decision;
  }

  isNamePending(name: string, except?: string): boolean {
    return (
      this.pending.some((proposal) => proposal.id !== except && keyOf(proposal.name) === keyOf(name)) ||
      this.pendingRevisions.some(
        (revision) =>
          revision.id !== except && revision.changes.name !== undefined && keyOf(revision.changes.name) === keyOf(name),
      )
    );
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
    if (this.isNamePending(name)) return this.problem(route, 409, 'contribution.pose-name-already-pending');

    const proposal: PoseProposalResponse = {
      id: crypto.randomUUID(),
      status: account.role === 'user' ? 'pending' : 'accepted',
      name,
      baseDifficulty: request.baseDifficulty as DifficultyCode,
      flyerDifficulty: request.flyerDifficulty as DifficultyCode,
      canStartFlow: request.canStartFlow ?? false,
      canEndFlow: request.canEndFlow ?? false,
    };
    const submitted = {
      name,
      baseDifficulty: proposal.baseDifficulty,
      flyerDifficulty: proposal.flyerDifficulty,
      canStartFlow: proposal.canStartFlow,
      canEndFlow: proposal.canEndFlow,
      contributorEmail: account.email,
    };
    if (proposal.status === 'pending') this.addPending(submitted);
    else this.addDirectPublication(submitted);
    return route.fulfill({ status: 201, json: proposal });
  }

  private problem(route: Route, status: number, title: string) {
    const body: ProblemDetails = { title, status };
    return route.fulfill({ status, contentType: 'application/problem+json', body: JSON.stringify(body) });
  }
}
