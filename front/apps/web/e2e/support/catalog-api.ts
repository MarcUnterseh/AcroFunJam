import type { BrowserContext, Route } from '@playwright/test';
import type { components } from '@acrofunjam/api-client/schema';

type PoseListResponse = components['schemas']['PoseListResponse'];
type PoseSummaryResponse = components['schemas']['PoseSummaryResponse'];
type PublishedPoseResponse = components['schemas']['PublishedPoseResponse'];
type LinkedTransitionResponse = components['schemas']['LinkedTransitionResponse'];
type ProblemDetails = components['schemas']['ProblemDetails'];
type PhotoResponse = components['schemas']['PhotoResponse'];
type VideoResponse = components['schemas']['VideoResponse'];
export type DifficultyCode = components['schemas']['DifficultyCode'];

type PublishedPose = {
  /** Story 9a: the tags of the pose (none when absent). */
  tagIds?: string[];
  name: string;
  baseDifficulty?: DifficultyCode;
  flyerDifficulty?: DifficultyCode;
  canStartFlow?: boolean;
  canEndFlow?: boolean;
};

/** The values of a published pose, as the API returns them. */
type PublishedValues = Omit<PoseSummaryResponse, 'id' | 'tags' | 'thumbnail'>;

/** A published pose as the simulated catalog keeps it: its values, its version (story 6) and its tags (story 9a). */
export type StoredPose = Omit<PoseSummaryResponse, 'tags' | 'thumbnail'> & {
  version: number;
  tagIds: string[];
};

/** A published transition (story 7): its poses by id, its optional name and description. */
export type PublishedTransition = {
  id: string;
  fromPoseId: string;
  toPoseId: string;
  name: string | null;
  baseDifficulty: DifficultyCode;
  flyerDifficulty: DifficultyCode;
  description: string | null;
  /** The tags it carries (story 8), read by the simulated list of tags. */
  tagIds?: string[];
};

/** A tag described: its name and its description (story 8). */
export type DescribedTag = { id: string; name: string; description: string };

/**
 * The simulated list of tags as the other simulated APIs read it (story 8): set by the simulated list itself (TagApi),
 * which reads the transitions of this catalog to count them. Without it, a transition carries no tag.
 */
export type TagDirectory = {
  /** These tags, with their names and descriptions, in catalog order; a tag unknown to the list is left out. */
  describe(ids: readonly string[]): DescribedTag[];
  /**
   * The chosen tags with the tags they add, and the chosen ones not in the list (ADR 0034); story 9a: for a pose, the
   * chosen ones that do not apply to the poses.
   */
  choose(
    ids: readonly string[],
    target?: 'pose' | 'transition',
  ): { tagIds: string[]; notInList: string[]; notApplicable: string[] };
};

/** Catalog order of the names (ADR 0017), enough for the scenarios of the site. */
const byCatalogOrder = (a: string, b: string) => a.localeCompare(b, 'en', { sensitivity: 'base' });

/**
 * Simulated catalog API (ADR 0006): the steps publish poses here, and GET /catalog/poses and
 * GET /catalog/poses/{id} are answered by Playwright with bodies typed by the generated OpenAPI schema.
 * What a scenario does not state gets a neutral value (discovery level, flow boundaries allowed). A revised pose
 * gets a new version (story 6, ADR 0024).
 */
export class CatalogApi {
  private readonly poses: StoredPose[] = [];
  /** Published transitions (story 7), in the order of publication. */
  readonly transitions: PublishedTransition[] = [];
  private unreachable = false;
  /** The simulated list of tags (story 8), set by TagApi. */
  tags: TagDirectory = {
    describe: () => [],
    choose: (ids) => ({ tagIds: [...ids], notInList: [], notApplicable: [] }),
  };
  /** Story 9a: whether a revision of the pose is pending (« pendingRevision »), set by the simulated revisions. */
  hasPendingRevision: (poseId: string) => boolean = () => false;
  /** Story 10: the photos of the pose, the main one first, set by the simulated photos (PhotoApi). */
  photosOf: (poseId: string) => PhotoResponse[] = () => [];
  /**
   * Story 12: the videos of the transition presented to the caller of the request, in the order of addition (a visitor:
   * the ready ones only), set by the simulated videos (VideoApi).
   */
  videosOf: (transitionId: string, route: Route) => VideoResponse[] = () => [];

  constructor(private readonly context: BrowserContext) {}

  publish(pose: PublishedPose): void {
    this.poses.push({
      id: crypto.randomUUID(),
      baseDifficulty: 'discovery',
      flyerDifficulty: 'discovery',
      canStartFlow: true,
      canEndFlow: true,
      ...pose,
      version: 1,
      tagIds: pose.tagIds ?? [],
    });
  }

  /** Story 9a: the pose carries these tags (tagged directly, or published with them). */
  tagPose(name: string, tagIds: readonly string[]): void {
    const pose = this.poseNamed(name);
    pose.tagIds = [...tagIds];
    pose.version += 1;
  }

  /** Story 9a: the published poses carrying this tag. */
  posesCarrying(tagId: string): StoredPose[] {
    return this.poses
      .filter((pose) => pose.tagIds.includes(tagId))
      .sort((a, b) => byCatalogOrder(a.name, b.name));
  }

  /** A transition published in the catalog (story 7): directly, or once its proposal is accepted. */
  publishTransition(transition: Omit<PublishedTransition, 'id'>): PublishedTransition {
    const published = { ...transition, id: crypto.randomUUID() };
    this.transitions.push(published);
    return published;
  }

  /** The published pose of this name. */
  poseNamed(name: string): StoredPose {
    const pose = this.poses.find((published) => published.name === name);
    if (!pose) throw new Error(`Aucune pose publiée de nom ${name}`);
    return pose;
  }

  poseWithId(id: string): StoredPose | undefined {
    return this.poses.find((published) => published.id === id);
  }

  /** The pose is revised (RevisePose): its values change, and so does its version. */
  revise(id: string, values: Partial<PublishedValues>): void {
    const pose = this.poseWithId(id);
    if (!pose) throw new Error(`Aucune pose publiée d'identifiant ${id}`);
    Object.assign(pose, values, { version: Number(pose.version) + 1 });
  }

  get publishedCount(): number {
    return this.poses.length;
  }

  get publishedNames(): string[] {
    return this.poses.map((pose) => pose.name);
  }

  setUnreachable(unreachable: boolean): void {
    this.unreachable = unreachable;
  }

  get isUnreachable(): boolean {
    return this.unreachable;
  }

  /** Story 9: the published poses, in the order of publication, with their tags. */
  get published(): readonly StoredPose[] {
    return this.poses;
  }

  async start(): Promise<void> {
    await this.context.route('**/catalog/poses', async (route) => {
      if (this.unreachable) return route.abort('connectionrefused');
      // In catalog order, as the API guarantees it (ADR 0007).
      const poses = [...this.poses].sort((a, b) => byCatalogOrder(a.name, b.name));
      const body: PoseListResponse = {
        poses: poses.map(({ version: _version, tagIds, ...pose }) => ({
          ...pose,
          tags: this.tags.describe(tagIds).map(({ id, name }) => ({ id, name })),
          thumbnail: this.photosOf(pose.id)[0]?.sources.thumbnail ?? null,
        })),
      };
      return route.fulfill({ json: body });
    });
    await this.context.route('**/catalog/poses/*', async (route) => {
      // PUT /catalog/poses/{id}/tags is answered by the simulated list of tags (story 9a).
      if (route.request().method() !== 'GET') return route.fallback();
      if (this.unreachable) return route.abort('connectionrefused');
      const id = new URL(route.request().url()).pathname.split('/').pop() ?? '';
      const pose = this.poseWithId(id);
      if (!pose) {
        const body: ProblemDetails = { title: 'catalog.pose-not-found', status: 404 };
        return route.fulfill({
          status: 404,
          contentType: 'application/problem+json',
          body: JSON.stringify(body),
        });
      }
      const { tagIds, ...values } = pose;
      const body: PublishedPoseResponse = {
        ...values,
        transitionsFrom: this.linked(pose.id, 'from', route),
        transitionsTo: this.linked(pose.id, 'to', route),
        tags: this.tags.describe(tagIds),
        pendingRevision: this.hasPendingRevision(pose.id),
        photos: this.photosOf(pose.id),
      };
      return route.fulfill({ json: body });
    });
  }

  /**
   * The transitions from or to a pose (ADR 0030), each with the other pose under its current name: ordered on the
   * other pose (catalog order), then on the name, the transitions without a name first.
   */
  private linked(poseId: string, direction: 'from' | 'to', route: Route): LinkedTransitionResponse[] {
    return this.transitions
      .filter((transition) => (direction === 'from' ? transition.fromPoseId : transition.toPoseId) === poseId)
      .map((transition) => {
        const other = this.poseWithId(direction === 'from' ? transition.toPoseId : transition.fromPoseId)!;
        const { id, name, baseDifficulty, flyerDifficulty, description, tagIds = [] } = transition;
        return {
          id,
          otherPose: { id: other.id, name: other.name },
          name,
          baseDifficulty,
          flyerDifficulty,
          description,
          tags: this.tags.describe(tagIds),
          videos: this.videosOf(id, route),
        };
      })
      .sort(
        (a, b) =>
          byCatalogOrder(a.otherPose.name, b.otherPose.name) ||
          (a.name === null ? -1 : 0) - (b.name === null ? -1 : 0) ||
          byCatalogOrder(a.name ?? '', b.name ?? ''),
      );
  }
}

const codesByLabel: Record<string, DifficultyCode> = {
  découverte: 'discovery',
  débutant: 'beginner',
  intermédiaire: 'intermediate',
  avancé: 'advanced',
};

export const difficultyCode = (label: string): DifficultyCode => {
  const code = codesByLabel[label];
  if (!code) throw new Error(`Niveau de difficulté inconnu : ${label}`);
  return code;
};
