import type { Page } from '@playwright/test';

export type DisplayedPose = { nom: string; 'difficulté base': string; 'difficulté flyer': string };

/** Page object of the catalog: selectors by role and accessible name only. */
export class CatalogPage {
  constructor(private readonly page: Page) {}

  async open(): Promise<void> {
    await this.page.goto('/');
  }

  get emptyCatalogMessage() {
    return this.page.getByText('Le catalogue ne contient encore aucune pose.');
  }

  get poseTable() {
    return this.table;
  }

  private get table() {
    return this.page.getByRole('table', { name: 'Poses du catalogue' });
  }

  async displayedPoses(): Promise<DisplayedPose[]> {
    await this.table.waitFor();
    const rows = this.table.getByRole('row').filter({ has: this.page.getByRole('cell') });
    const poses: DisplayedPose[] = [];
    for (const row of await rows.all()) {
      const [nom = '', base = '', flyer = ''] = await row.getByRole('cell').allInnerTexts();
      poses.push({ nom, 'difficulté base': base, 'difficulté flyer': flyer });
    }
    return poses;
  }
}
