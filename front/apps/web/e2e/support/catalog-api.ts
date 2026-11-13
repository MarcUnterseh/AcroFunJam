import type { BrowserContext } from '@playwright/test';
import type { components } from '@acrofunjam/api-client/schema';

type PoseListResponse = components['schemas']['PoseListResponse'];
type PoseSummaryResponse = components['schemas']['PoseSummaryResponse'];
type PublishedPoseResponse = components['schemas']['PublishedPoseResponse'];
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

/**
 * Simulated catalog API (ADR 0006): the steps publish poses here, and GET /catalog/poses and
 * GET /catalog/poses/{id} are answered by Playwright with bodies typed by the generated OpenAPI schema.
 * What a scenario does not state gets a neutral value (discovery level, flow boundaries allowed). A revised pose
 * gets a new version (story 6, ADR 0024).
 */
export class CatalogApi {
  private readonly poses: PublishedPoseResponse[] = [];
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

  /** The published pose of this name. */
  poseNamed(name: string): PublishedPoseResponse {
    const pose = this.poses.find((published) => published.name === name);
    if (!pose) throw new Error(`Aucune pose publiée de nom ${name}`);
    return pose;
  }

  poseWithId(id: string): PublishedPoseResponse | undefined {
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
      const body: PoseListResponse = { poses: this.poses.map(({ version: _version, ...pose }) => pose) };
      return route.fulfill({ json: body });
    });
    await this.context.route('**/catalog/poses/*', async (route) => {
      if (this.unreachable) return route.abort('connectionrefused');
      const id = new URL(route.request().url()).pathname.split('/').pop() ?? '';
      const pose = this.poseWithId(id);
      if (!pose) {
        const body: ProblemDetails = { title: 'catalog.pose-not-found', status: 404 };
        return route.fulfill({ status: 404, contentType: 'application/problem+json', body: JSON.stringify(body) });
      }
      return route.fulfill({ json: { ...pose } satisfies PublishedPoseResponse });
    });
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
