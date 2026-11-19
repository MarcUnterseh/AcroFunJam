import type { BrowserContext, Route } from '@playwright/test';
import type { components } from '@acrofunjam/api-client/schema';
import type { CatalogApi } from './catalog-api';
import type { IdentityApi } from './identity-api';

type TagResponse = components['schemas']['TagResponse'];
type TagListResponse = components['schemas']['TagListResponse'];
type ProblemDetails = components['schemas']['ProblemDetails'];

/** A tag as the simulated list keeps it: its name, its description, what it applies to and the tag it implies. */
type StoredTag = Omit<TagResponse, 'transitionCount' | 'poseCount'>;

/** Story 9a (ADR 0035): what a tag applies to. */
export type TagScope = 'poses' | 'transitions' | 'poses-and-transitions';

const appliesToPoses = (tag: StoredTag) => tag.scope !== 'transitions';
const appliesToTransitions = (tag: StoredTag) => tag.scope !== 'poses';

/** The comparison key of a name (ADR 0017), enough for the scenarios of the site. */
const keyOf = (name: string) =>
  name
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^\p{L}\p{Nd}]+/gu, ' ')
    .trim()
    .toLowerCase();

const byCatalogOrder = (a: StoredTag, b: StoredTag) => keyOf(a.name).localeCompare(keyOf(b.name), 'en');

type TagRequestBody = { name: string; description: string; scope: TagScope };

/**
 * Simulated list of tags (story 8, ADR 0034): the steps put tags here, the published transitions of the simulated
 * catalog carry them (`tagIds`), and GET, POST, PUT and DELETE /catalog/tags are answered by Playwright with bodies
 * typed by the generated OpenAPI schema. Same statuses and codes as the API: 401 without a session, 403 without
 * « gérer les étiquettes », 409 catalog.tag-name-taken and catalog.tag-carried.
 */
export class TagApi {
  private readonly tags: StoredTag[] = [];

  constructor(
    private readonly context: BrowserContext,
    private readonly identityApi: IdentityApi,
    private readonly catalogApi: CatalogApi,
  ) {
    catalogApi.tags = {
      describe: (ids) =>
        this.tags
          .filter((tag) => ids.includes(tag.id))
          .sort(byCatalogOrder)
          .map(({ id, name, description }) => ({ id, name, description })),
      choose: (ids, target) => this.choose(ids, target),
    };
  }

  add(
    name: string,
    description = `Ce que veut dire « ${name} ».`,
    impliedTagId: string | null = null,
    scope: TagScope = 'transitions',
  ): StoredTag {
    const tag = { id: crypto.randomUUID(), name, description, impliedTagId, scope };
    this.tags.push(tag);
    return tag;
  }

  /** Story 9a: no tag of the list applies to the poses (« aucune étiquette de la liste ne s'applique aux poses »). */
  restrictEveryTagToTransitions(): void {
    for (const tag of this.tags) tag.scope = 'transitions';
  }

  /** Story 9a: what the tag applies to changed elsewhere (by a validator, before the step). */
  changeScopeElsewhere(name: string, scope: TagScope): void {
    this.tagNamed(name).scope = scope;
  }

  /** The list as seeded at the first deployment (ADR 0032): « pop », « whip » and « icarien » add « dynamique ». */
  seed(): void {
    const dynamic = this.add(
      'dynamique',
      "Le passage se fait avec de l'élan : base et flyer se lancent dans le mouvement au lieu de le dérouler lentement.",
    );
    this.add(
      'pop',
      "La base propulse le flyer, qui quitte un instant tout contact avec elle avant d'être rattrapé.",
      dynamic.id,
    );
    this.add(
      'whip',
      "La base balance le flyer et l'élan le fait pivoter d'une prise à l'autre, vers l'avant ou vers l'arrière.",
      dynamic.id,
    );
    this.add(
      'icarien',
      'Style où la base, le plus souvent en L-basing, lance, fait tourner et rattrape le flyer surtout avec les pieds.',
      dynamic.id,
    );
    // Story 9a (ADR 0035, seeded revision 2): « lunaire » and « inversion » apply to the poses and the transitions.
    this.add(
      'lunaire',
      'Pratique thérapeutique : le flyer, détendu et passif, se laisse porter et étirer par la base ; les passages se font lentement. Ex. : Folded Leaf, Straddle Bat.',
      null,
      'poses-and-transitions',
    );
    this.add(
      'inversion',
      'La tête du flyer est plus basse que ses hanches, dans la pose ou à un moment de la transition. Ex. : Candlestick, Straddle Bat.',
      null,
      'poses-and-transitions',
    );
    this.add(
      'vrille',
      "Le flyer tourne sur lui-même autour de l'axe de son corps, par exemple du ventre vers le dos.",
    );
  }

  /** Taken out of the list elsewhere (by a validator, before the step): the transitions keep nothing of it here. */
  removeElsewhere(name: string): void {
    this.tags.splice(this.tags.indexOf(this.tagNamed(name)), 1);
  }

  /**
   * The chosen tags with the tags they add, in any order, the chosen ones not in the list, and (story 9a) the chosen ones
   * that do not apply to the target.
   */
  choose(
    ids: readonly string[],
    target: 'pose' | 'transition' = 'transition',
  ): { tagIds: string[]; notInList: string[]; notApplicable: string[] } {
    const notInList = ids.filter((id) => !this.tags.some((tag) => tag.id === id));
    const applies = target === 'pose' ? appliesToPoses : appliesToTransitions;
    const notApplicable = ids.filter((id) => this.tags.some((tag) => tag.id === id && !applies(tag)));
    const chosen = new Set(ids.filter((id) => !notInList.includes(id) && !notApplicable.includes(id)));
    for (const tag of this.tags) if (chosen.has(tag.id) && tag.impliedTagId) chosen.add(tag.impliedTagId);
    return { tagIds: [...chosen], notInList, notApplicable };
  }

  tagNamed(name: string): StoredTag {
    const tag = this.tags.find((stored) => stored.name === name);
    if (!tag) throw new Error(`Aucune étiquette de nom ${name}`);
    return tag;
  }

  async start(): Promise<void> {
    await this.context.route('**/catalog/tags', (route) =>
      route.request().method() === 'POST' ? this.manage(route, () => this.create(route)) : this.list(route),
    );
    await this.context.route('**/catalog/transitions/*/tags', (route) =>
      this.manage(route, () => this.tagTransition(route)),
    );
    await this.context.route('**/catalog/poses/*/tags', (route) =>
      this.manage(route, () => this.tagPose(route)),
    );
    await this.context.route('**/catalog/tags/*', (route) =>
      this.manage(route, () =>
        route.request().method() === 'DELETE' ? this.remove(route) : this.change(route),
      ),
    );
  }

  private list(route: Route) {
    const body: TagListResponse = {
      tags: [...this.tags].sort(byCatalogOrder).map((tag) => this.response(tag)),
    };
    return route.fulfill({ json: body });
  }

  private response(tag: StoredTag): TagResponse {
    const transitionCount = this.catalogApi.transitions.filter((t) => t.tagIds?.includes(tag.id)).length;
    return { ...tag, poseCount: this.catalogApi.posesCarrying(tag.id).length, transitionCount };
  }

  /** The session (401), then the capability (403), as the API policies do. */
  private manage(route: Route, answer: () => Promise<void>) {
    const account = this.identityApi.accountOf(route);
    if (!account) return this.problem(route, 401, 'Unauthorized');
    if (account.role === 'user') return this.problem(route, 403, 'identity.capability-required');
    return answer();
  }

  private isNameTaken(name: string, except?: string) {
    return this.tags.some((tag) => tag.id !== except && keyOf(tag.name) === keyOf(name));
  }

  private async create(route: Route) {
    const { name, description, scope } = route.request().postDataJSON() as TagRequestBody;
    if (this.isNameTaken(name)) return this.problem(route, 409, 'catalog.tag-name-taken');
    return route.fulfill({ status: 201, json: this.response(this.add(name, description, null, scope)) });
  }

  private idOf(route: Route) {
    return new URL(route.request().url()).pathname.split('/').pop() ?? '';
  }

  private async change(route: Route) {
    const tag = this.tags.find((stored) => stored.id === this.idOf(route));
    if (!tag) return this.problem(route, 404, 'catalog.tag-not-found');
    const { name, description, scope } = route.request().postDataJSON() as TagRequestBody;
    if (this.isNameTaken(name, tag.id)) return this.problem(route, 409, 'catalog.tag-name-taken');
    // Story 9a (A4): what it no longer applies to must not carry it.
    const narrowed = { ...tag, scope };
    const poses = appliesToPoses(narrowed) ? [] : this.carryingPoses(tag.id);
    const transitions = appliesToTransitions(narrowed) ? [] : this.carryingTransitions(tag.id);
    if (poses.length > 0 || transitions.length > 0)
      return this.problem(route, 409, 'catalog.tag-carried', {
        poses,
        transitions,
        pendingProposals: [],
        pendingPoses: [],
      });
    Object.assign(tag, { name, description, scope });
    return route.fulfill({ json: this.response(tag) });
  }

  private async remove(route: Route) {
    const index = this.tags.findIndex((stored) => stored.id === this.idOf(route));
    if (index < 0) return this.problem(route, 404, 'catalog.tag-not-found');
    const id = this.tags[index]!.id;
    const transitions = this.carryingTransitions(id);
    const poses = this.carryingPoses(id);
    if (transitions.length > 0 || poses.length > 0)
      return this.problem(route, 409, 'catalog.tag-carried', {
        poses,
        transitions,
        pendingProposals: [],
        pendingPoses: [],
      });
    this.tags.splice(index, 1);
    return route.fulfill({ status: 204 });
  }

  private carryingTransitions(id: string) {
    return this.catalogApi.transitions
      .filter((t) => t.tagIds?.includes(id))
      .map((t) => {
        const from = this.catalogApi.poseWithId(t.fromPoseId)!;
        const to = this.catalogApi.poseWithId(t.toPoseId)!;
        return {
          id: t.id,
          fromPose: { id: from.id, name: from.name },
          toPose: { id: to.id, name: to.name },
          name: t.name,
        };
      });
  }

  private carryingPoses(id: string) {
    return this.catalogApi.posesCarrying(id).map((pose) => ({ id: pose.id, name: pose.name }));
  }

  /**
   * PUT /catalog/poses/{id}/tags (story 9a, ADR 0036): replaces the tags of a published pose; refused while a revision of it
   * is pending, or with a tag not in the list or not applying to the poses.
   */
  private async tagPose(route: Route) {
    const segments = new URL(route.request().url()).pathname.split('/');
    const pose = this.catalogApi.poseWithId(segments[segments.length - 2] ?? '');
    if (!pose) return this.problem(route, 404, 'catalog.pose-not-found');
    if (this.catalogApi.hasPendingRevision(pose.id))
      return this.problem(route, 409, 'catalog.pose-revision-pending');
    const { tagIds } = route.request().postDataJSON() as { tagIds: string[] | null };
    const chosen = this.choose(tagIds ?? [], 'pose');
    if (chosen.notInList.length > 0)
      return this.problem(route, 409, 'catalog.tag-not-in-list', { tagIds: chosen.notInList });
    if (chosen.notApplicable.length > 0)
      return this.problem(route, 409, 'catalog.tag-not-applicable', { tagIds: chosen.notApplicable });
    this.catalogApi.tagPose(pose.name, chosen.tagIds);
    const tags = this.catalogApi.tags.describe(chosen.tagIds).map(({ id, name }) => ({ id, name }));
    return route.fulfill({ json: { id: pose.id, tags } });
  }

  /** PUT /catalog/transitions/{id}/tags: replaces the tags of a published transition (ADR 0034). */
  private async tagTransition(route: Route) {
    const segments = new URL(route.request().url()).pathname.split('/');
    const transition = this.catalogApi.transitions.find((t) => t.id === segments[segments.length - 2]);
    if (!transition) return this.problem(route, 404, 'catalog.transition-not-found');
    const { tagIds } = route.request().postDataJSON() as { tagIds: string[] | null };
    const chosen = this.choose(tagIds ?? []);
    if (chosen.notInList.length > 0)
      return this.problem(route, 409, 'catalog.tag-not-in-list', { tagIds: chosen.notInList });
    transition.tagIds = chosen.tagIds;
    const tags = this.catalogApi.tags.describe(chosen.tagIds).map(({ id, name }) => ({ id, name }));
    return route.fulfill({ json: { id: transition.id, tags } });
  }

  private problem(route: Route, status: number, title: string, extensions: Record<string, unknown> = {}) {
    const body: ProblemDetails = { title, status, ...extensions };
    return route.fulfill({ status, contentType: 'application/problem+json', body: JSON.stringify(body) });
  }
}
