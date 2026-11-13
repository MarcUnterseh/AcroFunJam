import type { BrowserContext } from '@playwright/test';
import type { components } from '@acrofunjam/api-client/schema';

type PoseListResponse = components['schemas']['PoseListResponse'];
type PoseSummaryResponse = components['schemas']['PoseSummaryResponse'];
type PublishedPoseResponse = components['schemas']['PublishedPoseResponse'];
type LinkedTransitionResponse = components['schemas']['LinkedTransitionResponse'];
type ProblemDetails = components['schemas']['ProblemDetails'];
export type DifficultyCode = components['schemas']['DifficultyCode'];

type PublishedPose = {
  name: string;
  baseDifficulty?: DifficultyCode;
  flyerDifficulty?: DifficultyCode;
  canStartFlow?: boolean;
  canEndFlow?: boolean;
};

/** The values of a published pose, as the API returns them. */
type PublishedValues = Omit<PoseSummaryResponse, 'id'>;

/** A published pose as the simulated catalog keeps it: its values and its version (story 6). */
type StoredPose = PoseSummaryResponse & { version: number };

/** A published transition (story 7): its poses by id, its optional name and description. */
export type PublishedTransition = {
  id: string;
  fromPoseId: string;
  toPoseId: string;
  name: string | null;
  baseDifficulty: DifficultyCode;
  flyerDifficulty: DifficultyCode;
  description: string | null;
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
    });
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

  async start(): Promise<void> {
    await this.context.route('**/catalog/poses', async (route) => {
      if (this.unreachable) return route.abort('connectionrefused');
      // In catalog order, as the API guarantees it (ADR 0007).
      const poses = [...this.poses].sort((a, b) => byCatalogOrder(a.name, b.name));
      const body: PoseListResponse = { poses: poses.map(({ version: _version, ...pose }) => pose) };
      return route.fulfill({ json: body });
    });
    await this.context.route('**/catalog/poses/*', async (route) => {
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
      const body: PublishedPoseResponse = {
        ...pose,
        transitionsFrom: this.linked(pose.id, 'from'),
        transitionsTo: this.linked(pose.id, 'to'),
      };
      return route.fulfill({ json: body });
    });
  }

  /**
   * The transitions from or to a pose (ADR 0030), each with the other pose under its current name: ordered on the
   * other pose (catalog order), then on the name, the transitions without a name first.
   */
  private linked(poseId: string, direction: 'from' | 'to'): LinkedTransitionResponse[] {
    return this.transitions
      .filter((transition) => (direction === 'from' ? transition.fromPoseId : transition.toPoseId) === poseId)
      .map((transition) => {
        const other = this.poseWithId(direction === 'from' ? transition.toPoseId : transition.fromPoseId)!;
        const { id, name, baseDifficulty, flyerDifficulty, description } = transition;
        return {
          id,
          otherPose: { id: other.id, name: other.name },
          name,
          baseDifficulty,
          flyerDifficulty,
          description,
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
