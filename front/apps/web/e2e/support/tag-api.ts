import type { BrowserContext, Route } from '@playwright/test';
import type { components } from '@acrofunjam/api-client/schema';
import type { CatalogApi } from './catalog-api';
import type { IdentityApi } from './identity-api';

type TagResponse = components['schemas']['TagResponse'];
type TagListResponse = components['schemas']['TagListResponse'];
type ProblemDetails = components['schemas']['ProblemDetails'];

/** A tag as the simulated list keeps it: its name, its description and the tag it implies. */
type StoredTag = Omit<TagResponse, 'transitionCount'>;

/** The comparison key of a name (ADR 0017), enough for the scenarios of the site. */
const keyOf = (name: string) =>
  name
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^\p{L}\p{Nd}]+/gu, ' ')
    .trim()
    .toLowerCase();

const byCatalogOrder = (a: StoredTag, b: StoredTag) => keyOf(a.name).localeCompare(keyOf(b.name), 'en');

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
      choose: (ids) => this.choose(ids),
    };
  }

  add(
    name: string,
    description = `Ce que veut dire « ${name} ».`,
    impliedTagId: string | null = null,
  ): StoredTag {
    const tag = { id: crypto.randomUUID(), name, description, impliedTagId };
    this.tags.push(tag);
    return tag;
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
    this.add(
      'lunaire',
      'Pratique thérapeutique : le flyer, détendu et passif, se laisse porter, étirer ou retourner lentement par la base.',
    );
    this.add('inversion', 'Le flyer passe la tête en bas pendant la transition.');
    this.add(
      'vrille',
      "Le flyer tourne sur lui-même autour de l'axe de son corps, par exemple du ventre vers le dos.",
    );
  }

  /** Taken out of the list elsewhere (by a validator, before the step): the transitions keep nothing of it here. */
  removeElsewhere(name: string): void {
    this.tags.splice(this.tags.indexOf(this.tagNamed(name)), 1);
  }

  /** The chosen tags with the tags they add, in any order, and the chosen ones not in the list. */
  choose(ids: readonly string[]): { tagIds: string[]; notInList: string[] } {
    const notInList = ids.filter((id) => !this.tags.some((tag) => tag.id === id));
    const chosen = new Set(ids.filter((id) => !notInList.includes(id)));
    for (const tag of this.tags) if (chosen.has(tag.id) && tag.impliedTagId) chosen.add(tag.impliedTagId);
    return { tagIds: [...chosen], notInList };
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
    return { ...tag, transitionCount };
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
    const { name, description } = route.request().postDataJSON() as { name: string; description: string };
    if (this.isNameTaken(name)) return this.problem(route, 409, 'catalog.tag-name-taken');
    return route.fulfill({ status: 201, json: this.response(this.add(name, description)) });
  }

  private idOf(route: Route) {
    return new URL(route.request().url()).pathname.split('/').pop() ?? '';
  }

  private async change(route: Route) {
    const tag = this.tags.find((stored) => stored.id === this.idOf(route));
    if (!tag) return this.problem(route, 404, 'catalog.tag-not-found');
    const { name, description } = route.request().postDataJSON() as { name: string; description: string };
    if (this.isNameTaken(name, tag.id)) return this.problem(route, 409, 'catalog.tag-name-taken');
    Object.assign(tag, { name, description });
    return route.fulfill({ json: this.response(tag) });
  }

  private async remove(route: Route) {
    const index = this.tags.findIndex((stored) => stored.id === this.idOf(route));
    if (index < 0) return this.problem(route, 404, 'catalog.tag-not-found');
    const id = this.tags[index]!.id;
    const carriers = this.catalogApi.transitions.filter((t) => t.tagIds?.includes(id));
    if (carriers.length > 0) {
      const transitions = carriers.map((t) => {
        const from = this.catalogApi.poseWithId(t.fromPoseId)!;
        const to = this.catalogApi.poseWithId(t.toPoseId)!;
        return {
          id: t.id,
          fromPose: { id: from.id, name: from.name },
          toPose: { id: to.id, name: to.name },
          name: t.name,
        };
      });
      return this.problem(route, 409, 'catalog.tag-carried', { transitions, pendingProposals: [] });
    }
    this.tags.splice(index, 1);
    return route.fulfill({ status: 204 });
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
