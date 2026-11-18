import type { BrowserContext, Route } from '@playwright/test';
import type { components } from '@acrofunjam/api-client/schema';
import type { CatalogApi, DifficultyCode } from './catalog-api';
import {
  keyOf,
  normalised,
  type ContributionApi,
  type SubmittedTransition,
  type TransitionValues,
} from './contribution-api';
import type { IdentityApi } from './identity-api';

type ProposeTransitionRequest = components['schemas']['ProposeTransitionRequest'];
type TransitionProposalResponse = components['schemas']['TransitionProposalResponse'];
type AcceptTransitionProposalRequest = components['schemas']['AcceptTransitionProposalRequest'];
type AcceptedTransitionProposalResponse = components['schemas']['AcceptedTransitionProposalResponse'];
type RejectPoseProposalRequest = components['schemas']['RejectPoseProposalRequest'];
type RejectedPoseProposalResponse = components['schemas']['RejectedPoseProposalResponse'];
type ProblemDetails = components['schemas']['ProblemDetails'];

/** Every decision is taken on 8 November 2026, as for the other proposals. */
const decisionDate = new Date(Date.UTC(2026, 10, 8, 10)).toISOString();
const normalisedText = (text: string | null | undefined) =>
  (text ?? '').split(/\s+/u).filter(Boolean).join(' ');
const optionalName = (raw: string | null | undefined) => normalised(raw ?? '') || null;
const optionalDescription = (raw: string | null | undefined) => (raw ?? '').trim() || null;
/** The same set of tags, whatever their order. */
const sameTags = (a: readonly string[] = [], b: readonly string[] = []) =>
  a.length === b.length && a.every((id) => b.includes(id));

/** A transition sent by the site, as received. */
export type SentTransition = ProposeTransitionRequest;

/**
 * Simulated transitions of the Contribution API (story 7, ADR 0029, ADR 0030): POST /contribution/transition-proposals
 * and the decisions on a transition. Same statuses and codes as the API: 401 without a valid session, 403 without the
 * capability to decide, 404 unknown pose, 409 place taken between the poses (a name, or the place without a name, in
 * the catalog or pending) or proposal already decided. A user's transition is pending; a validator's or an
 * administrator's is published at once in the simulated catalog. Shares the proposals and the reachability of the
 * simulated Contribution API (one API). The rules themselves are checked by the @api scenarios.
 */
export class TransitionApi {
  /** Transitions received, as sent by the site. */
  readonly received: SentTransition[] = [];
  /** Decisions on transitions received, as sent by the site. */
  readonly decisions: Array<{
    id: string;
    body: AcceptTransitionProposalRequest | RejectPoseProposalRequest | null;
  }> = [];

  constructor(
    private readonly context: BrowserContext,
    private readonly identityApi: IdentityApi,
    private readonly catalogApi: CatalogApi,
    private readonly contributionApi: ContributionApi,
  ) {}

  async start(): Promise<void> {
    await this.context.route('**/contribution/transition-proposals', (route) =>
      this.handle(route, false, () => this.propose(route)),
    );
    await this.context.route('**/contribution/transition-proposals/*/acceptance', (route) =>
      this.handle(route, true, () => this.accept(route)),
    );
    await this.context.route('**/contribution/transition-proposals/*/rejection', (route) =>
      this.handle(route, true, () => this.reject(route)),
    );
  }

  /** Accepted elsewhere (before the scenario), as proposed, or with other tags (story 8). */
  acceptElsewhere(transition: SubmittedTransition, tagIds?: string[]): void {
    const values = this.valuesOf(transition);
    this.publish(
      transition,
      tagIds ? { ...values, tagIds: this.catalogApi.tags.choose(tagIds).tagIds } : values,
      null,
    );
  }

  /** The values of a transition as answered: its tags by id and current name, in catalog order. */
  private response({ tagIds = [], ...values }: TransitionValues) {
    return { ...values, tags: this.catalogApi.tags.describe(tagIds).map(({ id, name }) => ({ id, name })) };
  }

  /** Reachability, then the session (401), then the capability to decide (403), as the API policies do. */
  private async handle(route: Route, decision: boolean, answer: () => Promise<void>): Promise<void> {
    if (this.contributionApi.isUnreachable) return route.abort('connectionrefused');
    const account = this.identityApi.accountOf(route);
    if (!account) return this.problem(route, 401, 'Unauthorized');
    if (decision && account.role === 'user') return this.problem(route, 403, 'identity.capability-required');
    return answer();
  }

  /** Where the place of a transition is taken between its poses, in this direction: the catalog, a pending one. */
  private placeTaken(
    fromPoseId: string,
    toPoseId: string,
    name: string | null,
    except?: string,
  ): 'in-catalog' | 'pending' | null {
    const sameSlot = (other: { fromPoseId: string; toPoseId: string; name: string | null }) =>
      other.fromPoseId === fromPoseId &&
      other.toPoseId === toPoseId &&
      (name === null ? other.name === null : other.name !== null && keyOf(other.name) === keyOf(name));
    if (this.catalogApi.transitions.some(sameSlot)) return 'in-catalog';
    if (this.contributionApi.pendingTransitions.some((other) => other.id !== except && sameSlot(other)))
      return 'pending';
    return null;
  }

  private placeTakenCode(place: 'in-catalog' | 'pending', named: boolean): string {
    const what = named ? 'transition-name' : 'unnamed-transition';
    return `contribution.${what}-already-${place === 'in-catalog' ? 'in-catalog' : 'pending'}`;
  }

  private async propose(route: Route): Promise<void> {
    const account = this.identityApi.accountOf(route)!;
    const request = route.request().postDataJSON() as ProposeTransitionRequest;
    this.received.push(request);
    const from = this.catalogApi.poseWithId(request.fromPoseId ?? '');
    if (!from) return this.problem(route, 404, 'contribution.from-pose-not-found');
    const to = this.catalogApi.poseWithId(request.toPoseId ?? '');
    if (!to) return this.problem(route, 404, 'contribution.to-pose-not-found');
    const name = optionalName(request.name);
    const place = this.placeTaken(from.id, to.id, name);
    if (place) return this.problem(route, 409, this.placeTakenCode(place, name !== null));
    const chosen = this.catalogApi.tags.choose(request.tagIds ?? []);
    if (chosen.notInList.length > 0)
      return this.problem(route, 409, 'contribution.tag-not-in-list', { tagIds: chosen.notInList });

    const directly = account.role !== 'user';
    const values: TransitionValues = {
      name,
      baseDifficulty: request.baseDifficulty as DifficultyCode,
      flyerDifficulty: request.flyerDifficulty as DifficultyCode,
      description: optionalDescription(request.description),
      tagIds: chosen.tagIds,
    };
    const transition = this.contributionApi.addTransition(
      { fromPoseId: from.id, toPoseId: to.id, contributorEmail: account.email, ...values },
      directly,
    );
    const answer: TransitionProposalResponse = {
      id: transition.id,
      status: directly ? 'accepted' : 'pending',
      fromPose: { id: from.id, name: from.name },
      toPose: { id: to.id, name: to.name },
      ...this.response(values),
    };
    return route.fulfill({ status: 201, json: answer });
  }

  private async accept(route: Route): Promise<void> {
    const id = this.idOf(route);
    const body = (route.request().postDataJSON() ?? null) as AcceptTransitionProposalRequest | null;
    this.decisions.push({ id, body });
    const transition = this.contributionApi.transitions.find((submitted) => submitted.id === id);
    if (!transition) return this.problem(route, 404, 'contribution.proposal-not-found');
    if (transition.decision) return this.problem(route, 409, 'contribution.proposal-already-decided');
    // Absent or null keeps the proposed value; an empty text removes the name or the description (ADR 0030).
    const retained: TransitionValues = {
      name: body?.name != null ? optionalName(body.name) : transition.name,
      baseDifficulty: (body?.baseDifficulty ?? transition.baseDifficulty) as DifficultyCode,
      flyerDifficulty: (body?.flyerDifficulty ?? transition.flyerDifficulty) as DifficultyCode,
      description: body?.description != null ? optionalDescription(body.description) : transition.description,
      tagIds: transition.tagIds ?? [],
    };
    if (body?.tagIds != null) {
      const chosen = this.catalogApi.tags.choose(body.tagIds);
      if (chosen.notInList.length > 0)
        return this.problem(route, 409, 'contribution.tag-not-in-list', { tagIds: chosen.notInList });
      retained.tagIds = chosen.tagIds;
    }
    const place = this.placeTaken(transition.fromPoseId, transition.toPoseId, retained.name, transition.id);
    if (place) return this.problem(route, 409, this.placeTakenCode(place, retained.name !== null));
    const proposed = this.valuesOf(transition);
    const adjusted =
      !sameTags(retained.tagIds, proposed.tagIds) ||
      (['name', 'baseDifficulty', 'flyerDifficulty', 'description'] as const).some(
        (field) => retained[field] !== proposed[field],
      );
    this.publish(transition, retained, adjusted ? normalisedText(body?.message) || null : null);
    const from = this.catalogApi.poseWithId(transition.fromPoseId)!;
    const to = this.catalogApi.poseWithId(transition.toPoseId)!;
    const answer: AcceptedTransitionProposalResponse = {
      id,
      status: 'accepted',
      adjusted,
      fromPose: { id: from.id, name: from.name },
      toPose: { id: to.id, name: to.name },
      ...this.response(retained),
    };
    return route.fulfill({ json: answer });
  }

  private async reject(route: Route): Promise<void> {
    const id = this.idOf(route);
    const body = route.request().postDataJSON() as RejectPoseProposalRequest;
    this.decisions.push({ id, body });
    const reason = normalisedText(body.reason);
    if (reason === '') return this.problem(route, 400, 'contribution.rejection-reason-required');
    const transition = this.contributionApi.transitions.find((submitted) => submitted.id === id);
    if (!transition) return this.problem(route, 404, 'contribution.proposal-not-found');
    if (transition.decision) return this.problem(route, 409, 'contribution.proposal-already-decided');
    transition.decision = { kind: 'rejected', reason, decidedAt: decisionDate };
    const answer: RejectedPoseProposalResponse = { id, status: 'rejected' };
    return route.fulfill({ json: answer });
  }

  private publish(transition: SubmittedTransition, retained: TransitionValues, message: string | null): void {
    transition.decision = { kind: 'accepted', retained, message, decidedAt: decisionDate };
    this.catalogApi.publishTransition({
      fromPoseId: transition.fromPoseId,
      toPoseId: transition.toPoseId,
      ...retained,
      tagIds: retained.tagIds ?? [],
    });
  }

  private valuesOf({
    name,
    baseDifficulty,
    flyerDifficulty,
    description,
    tagIds,
  }: SubmittedTransition): TransitionValues {
    return { name, baseDifficulty, flyerDifficulty, description, tagIds: tagIds ?? [] };
  }

  private idOf(route: Route): string {
    const segments = new URL(route.request().url()).pathname.split('/');
    return segments[segments.length - 2] ?? '';
  }

  private problem(route: Route, status: number, title: string, extensions: Record<string, unknown> = {}) {
    const body: ProblemDetails = { title, status, ...extensions };
    return route.fulfill({ status, contentType: 'application/problem+json', body: JSON.stringify(body) });
  }
}
