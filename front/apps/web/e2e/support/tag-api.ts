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
  ) {}

  add(name: string, description = `Ce que veut dire « ${name} ».`): StoredTag {
    const tag = { id: crypto.randomUUID(), name, description, impliedTagId: null };
    this.tags.push(tag);
    return tag;
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

  private problem(route: Route, status: number, title: string, extensions: Record<string, unknown> = {}) {
    const body: ProblemDetails = { title, status, ...extensions };
    return route.fulfill({ status, contentType: 'application/problem+json', body: JSON.stringify(body) });
  }
}
