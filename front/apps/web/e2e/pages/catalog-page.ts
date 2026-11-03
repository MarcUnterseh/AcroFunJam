import type { Locator, Page } from '@playwright/test';

/** A pose card as read on the page: each term of its description list and its value. */
export type DisplayedPose = {
  nom: string;
  base: string;
  flyer: string;
  commencer: string;
  terminer: string;
};

/** Page object of the catalog: selectors by role and accessible name only. */
export class CatalogPage {
  constructor(private readonly page: Page) {}

  async open(): Promise<void> {
    await this.page.goto('/');
  }

  get emptyCatalogMessage() {
    return this.page.getByText('Le catalogue ne contient encore aucune pose.');
  }

  get poseList() {
    return this.page.getByRole('list', { name: 'Poses du catalogue' });
  }

  poseCount(text: string) {
    return this.page.getByText(text, { exact: true });
  }

  get difficultyScale() {
    return this.page.getByRole('list', { name: /^Niveaux de difficulté/ });
  }

  get responsibilityWarning() {
    return this.page.getByText(
      'Tu restes juge de tes limites : pratique à ton niveau et prévois un spotter quand tu en as besoin.',
      { exact: true },
    );
  }

  get firstPoseInvitation() {
    return this.page.getByText('Propose la première pose du catalogue.', { exact: true });
  }

  get proposePoseLinks() {
    return this.page.getByRole('link', { name: 'Proposer une pose' });
  }

  get loadingFailure() {
    return this.page.getByRole('alert');
  }

  async retry(): Promise<void> {
    // The button sits next to the alert message, not inside it (its busy label must not re-read the alert).
    await this.page.getByRole('button', { name: 'Réessayer' }).click();
  }

  async scaleLevels(): Promise<string[]> {
    return (await this.difficultyScale.getByRole('listitem').allInnerTexts()).map((level) => level.trim());
  }

  async displayedPoses(): Promise<DisplayedPose[]> {
    await this.poseList.waitFor();
    const poses: DisplayedPose[] = [];
    for (const card of await this.poseList.getByRole('listitem').all()) poses.push(await this.readCard(card));
    return poses;
  }

  private async readCard(card: Locator): Promise<DisplayedPose> {
    const terms = await card.getByRole('term').allInnerTexts();
    const values = await card.getByRole('definition').allInnerTexts();
    const valueOf = (term: string) => (values[terms.indexOf(term)] ?? '').trim();
    return {
      nom: (await card.getByRole('heading', { level: 2 }).innerText()).trim(),
      base: valueOf('Base'),
      flyer: valueOf('Flyer'),
      commencer: valueOf('Peut commencer un flow'),
      terminer: valueOf('Peut terminer un flow'),
    };
  }
}
