import type { Page } from '@playwright/test';
import type { components } from '@acrofunjam/api-client/schema';

type PoseListResponse = components['schemas']['PoseListResponse'];
type PoseSummaryResponse = components['schemas']['PoseSummaryResponse'];
export type DifficultyCode = components['schemas']['DifficultyCode'];

/**
 * Simulated catalog API (ADR 0006): the steps publish poses here, and GET /catalog/poses
 * is answered by Playwright with a body typed by the generated OpenAPI schema.
 */
export class CatalogApi {
  private readonly poses: PoseSummaryResponse[] = [];

  constructor(private readonly page: Page) {}

  publish(pose: { name: string; baseDifficulty: DifficultyCode; flyerDifficulty: DifficultyCode }): void {
    this.poses.push({ id: crypto.randomUUID(), ...pose });
  }

  get publishedCount(): number {
    return this.poses.length;
  }

  async start(): Promise<void> {
    await this.page.route('**/catalog/poses', async (route) => {
      const body: PoseListResponse = { poses: this.poses };
      await route.fulfill({ json: body });
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
