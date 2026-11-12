import type { BrowserContext, Route } from '@playwright/test';
import type { components } from '@acrofunjam/api-client/schema';
import type { CatalogApi, DifficultyCode } from './catalog-api';
import {
  keyOf,
  normalised,
  type ContributionApi,
  type PendingProposal,
  type PoseValues,
  type ProposalDecision,
} from './contribution-api';
import type { IdentityApi } from './identity-api';

type ValidationQueueResponse = components['schemas']['ValidationQueueResponse'];
type PendingCountResponse = components['schemas']['PendingCountResponse'];
type AcceptPoseProposalRequest = components['schemas']['AcceptPoseProposalRequest'];
type AcceptedPoseProposalResponse = components['schemas']['AcceptedPoseProposalResponse'];
type RejectPoseProposalRequest = components['schemas']['RejectPoseProposalRequest'];
type RejectedPoseProposalResponse = components['schemas']['RejectedPoseProposalResponse'];
type ProblemDetails = components['schemas']['ProblemDetails'];

/** A decision the site sent, as received. */
export type SentDecision =
  | { kind: 'acceptance'; id: string; body: AcceptPoseProposalRequest | null }
  | { kind: 'rejection'; id: string; body: RejectPoseProposalRequest };

const maxValidatorTextLength = 500;
/** Every decision is taken on 8 November 2026 (after the submissions, one day apart from 1 November). */
const decisionDate = new Date(Date.UTC(2026, 10, 8, 10)).toISOString();
const normalisedText = (text: string | null | undefined) =>
  (text ?? '').split(/\s+/u).filter(Boolean).join(' ');

/**
 * Simulated validation API of Contribution (ADR 0006, ADR 0022): the validation queue, its count, and the
 * acceptance and rejection of a proposal. Same statuses and codes as the API (ProblemResults): 401 without a
 * valid session, 403 identity.capability-required without the capability (role revoked), 404 unknown
 * proposal, 409 already decided or name taken. Shares the pending proposals and the reachability of the
 * simulated Contribution API (one API). The rules themselves are checked by the @api scenarios.
 */
export class ValidationApi {
  /** Proposals decided, no longer pending: kept to answer « already decided ». */
  private readonly decided = new Map<string, PendingProposal>();
  /** Decisions received, as sent by the site. */
  readonly decisions: SentDecision[] = [];
  /** How many times the site asked for the count of pending proposals. */
  countRequests = 0;

  constructor(
    private readonly context: BrowserContext,
    private readonly identityApi: IdentityApi,
    private readonly catalogApi: CatalogApi,
    private readonly contributionApi: ContributionApi,
  ) {}

  /** The proposals pending validation, the oldest first. */
  get queue(): readonly PendingProposal[] {
    return this.contributionApi.pending;
  }

  /**
   * A decision taken elsewhere (another validator, another tab, before the scenario): accepted, as proposed or
   * with the adjustments and the message given.
   */
  acceptElsewhere(name: string, adjustments: AcceptPoseProposalRequest | null = null): void {
    const proposal = this.pendingProposal(name);
    const retained = this.retained(proposal, adjustments);
    this.decide(proposal, this.acceptance(retained, normalisedText(adjustments?.message) || null));
    this.catalogApi.publish(retained);
  }

  /** A rejection decided elsewhere (before the scenario), with its reason. */
  rejectElsewhere(name: string, reason: string): void {
    this.decide(this.pendingProposal(name), this.rejection(normalisedText(reason)));
  }

  private pendingProposal(name: string): PendingProposal {
    const proposal = this.contributionApi.pending.find((pending) => pending.name === name);
    if (!proposal) throw new Error(`Aucune proposition en attente de la pose ${name}`);
    return proposal;
  }

  async start(): Promise<void> {
    await this.context.route('**/contribution/validation-queue', (route) =>
      this.handle(route, () => this.listQueue(route)),
    );
    await this.context.route('**/contribution/validation-queue/count', (route) =>
      this.handle(route, () => this.count(route)),
    );
    await this.context.route('**/contribution/pose-proposals/*/acceptance', (route) =>
      this.handle(route, () => this.accept(route)),
    );
    await this.context.route('**/contribution/pose-proposals/*/rejection', (route) =>
      this.handle(route, () => this.reject(route)),
    );
  }

  /** Reachability, then the session (401), then the capability (403), as the API policies do. */
  private async handle(route: Route, answer: () => Promise<void>): Promise<void> {
    if (this.contributionApi.isUnreachable) return route.abort('connectionrefused');
    const account = this.identityApi.accountOf(route);
    if (!account) return this.problem(route, 401, 'Unauthorized');
    if (account.role === 'user') return this.problem(route, 403, 'identity.capability-required');
    return answer();
  }

  private async listQueue(route: Route): Promise<void> {
    const requester = this.identityApi.accountOf(route)!.email.toLowerCase();
    const body: ValidationQueueResponse = {
      proposals: this.queue.map(({ contributorEmail, ...proposal }) => ({
        ...proposal,
        contributor: { email: contributorEmail, isYou: contributorEmail.toLowerCase() === requester },
      })),
    };
    return route.fulfill({ json: body });
  }

  private async count(route: Route): Promise<void> {
    this.countRequests += 1;
    const body: PendingCountResponse = { count: this.queue.length };
    return route.fulfill({ json: body });
  }

  private async accept(route: Route): Promise<void> {
    const id = this.idOf(route);
    const body = (route.request().postDataJSON() ?? null) as AcceptPoseProposalRequest | null;
    this.decisions.push({ kind: 'acceptance', id, body });
    // The content of the request (adjustments, message) is checked first, as the API does before reading the proposal.
    if (body?.name != null && !/[\p{L}\p{Nd}]/u.test(body.name))
      return this.problem(route, 400, 'pose.name-required');
    const note = normalisedText(body?.message);
    if ([...note].length > maxValidatorTextLength)
      return this.problem(route, 400, 'contribution.adjustment-note-too-long');
    if (this.decided.has(id)) return this.problem(route, 409, 'contribution.proposal-already-decided');
    const proposal = this.contributionApi.pending.find((pending) => pending.id === id);
    if (!proposal) return this.problem(route, 404, 'contribution.proposal-not-found');

    const retained = this.retained(proposal, body);
    const key = keyOf(retained.name);
    if (this.catalogApi.publishedNames.some((published) => keyOf(published) === key))
      return this.problem(route, 409, 'contribution.pose-name-already-in-catalog');
    if (this.contributionApi.isNamePending(retained.name, proposal.id))
      return this.problem(route, 409, 'contribution.pose-name-already-pending');
    const adjusted = (Object.keys(retained) as (keyof typeof retained)[]).some(
      (field) => retained[field] !== proposal[field],
    );
    if (note !== '' && !adjusted)
      return this.problem(route, 422, 'contribution.adjustment-note-without-adjustment');

    this.decide(proposal, this.acceptance(retained, note || null));
    this.catalogApi.publish(retained);
    const answer: AcceptedPoseProposalResponse = { id, status: 'accepted', adjusted, ...retained };
    return route.fulfill({ json: answer });
  }

  private async reject(route: Route): Promise<void> {
    const id = this.idOf(route);
    const body = route.request().postDataJSON() as RejectPoseProposalRequest;
    this.decisions.push({ kind: 'rejection', id, body });
    const reason = normalisedText(body.reason);
    if (reason === '') return this.problem(route, 400, 'contribution.rejection-reason-required');
    if ([...reason].length > maxValidatorTextLength)
      return this.problem(route, 400, 'contribution.rejection-reason-too-long');
    if (this.decided.has(id)) return this.problem(route, 409, 'contribution.proposal-already-decided');
    const proposal = this.contributionApi.pending.find((pending) => pending.id === id);
    if (!proposal) return this.problem(route, 404, 'contribution.proposal-not-found');

    this.decide(proposal, this.rejection(reason));
    const answer: RejectedPoseProposalResponse = { id, status: 'rejected' };
    return route.fulfill({ json: answer });
  }

  private decide(proposal: PendingProposal, decision: ProposalDecision): void {
    this.contributionApi.decide(proposal.id, decision);
    this.decided.set(proposal.id, proposal);
  }

  private acceptance(retained: PoseValues, message: string | null): ProposalDecision {
    return { kind: 'accepted', retained, message, decidedAt: decisionDate };
  }

  private rejection(reason: string): ProposalDecision {
    return { kind: 'rejected', reason, decidedAt: decisionDate };
  }

  /** The proposed pose with the adjustments of the request: an absent or null value keeps the proposed one. */
  private retained(proposal: PendingProposal, body: AcceptPoseProposalRequest | null): PoseValues {
    return {
      name: body?.name != null ? normalised(body.name) : proposal.name,
      baseDifficulty: (body?.baseDifficulty ?? proposal.baseDifficulty) as DifficultyCode,
      flyerDifficulty: (body?.flyerDifficulty ?? proposal.flyerDifficulty) as DifficultyCode,
      canStartFlow: body?.canStartFlow ?? proposal.canStartFlow,
      canEndFlow: body?.canEndFlow ?? proposal.canEndFlow,
    };
  }

  private idOf(route: Route): string {
    const segments = new URL(route.request().url()).pathname.split('/');
    return segments[segments.length - 2] ?? '';
  }

  private problem(route: Route, status: number, title: string) {
    const body: ProblemDetails = { title, status };
    return route.fulfill({ status, contentType: 'application/problem+json', body: JSON.stringify(body) });
  }
}
