import type { BrowserContext } from '@playwright/test';
import type { components } from '@acrofunjam/api-client/schema';

type PoseListResponse = components['schemas']['PoseListResponse'];
type PoseSummaryResponse = components['schemas']['PoseSummaryResponse'];
export type DifficultyCode = components['schemas']['DifficultyCode'];

type PublishedPose = {
  name: string;
  baseDifficulty?: DifficultyCode;
  flyerDifficulty?: DifficultyCode;
  canStartFlow?: boolean;
  canEndFlow?: boolean;
};

/**
 * Simulated catalog API (ADR 0006): the steps publish poses here, and GET /catalog/poses
 * is answered by Playwright with a body typed by the generated OpenAPI schema.
 * What a scenario does not state gets a neutral value (discovery level, flow boundaries allowed).
 */
export class CatalogApi {
  private readonly poses: PoseSummaryResponse[] = [];
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
    });
  }

  get publishedCount(): number {
    return this.poses.length;
  }

  setUnreachable(unreachable: boolean): void {
    this.unreachable = unreachable;
  }

  async start(): Promise<void> {
    await this.context.route('**/catalog/poses', async (route) => {
      if (this.unreachable) return route.abort('connectionrefused');
      const body: PoseListResponse = { poses: this.poses };
      return route.fulfill({ json: body });
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
