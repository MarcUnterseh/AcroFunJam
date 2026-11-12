import type { Locator, Page } from '@playwright/test';

export const myProposalsPath = '/mes-propositions';

/**
 * Page object of « Mes propositions » (docs/design/ecrans/5-mes-propositions.md): selectors by role and
 * accessible name only. Each proposal is an article named by its h2 (the presented name); its status starts with
 * a visually hidden « Statut : ».
 */
export class MyProposalsPage {
  constructor(private readonly page: Page) {}

  get title() {
    return this.page.getByRole('heading', { level: 1, name: 'Mes propositions' });
  }

  get list() {
    return this.page.getByRole('main').getByRole('list');
  }

  get cards() {
    return this.page.getByRole('main').getByRole('article');
  }

  get emptyMessage() {
    return this.page.getByText("Tu n'as encore proposé aucune pose.", { exact: true });
  }

  get proposePoseLink() {
    return this.page.getByRole('main').getByRole('link', { name: 'Proposer une pose' });
  }

  get alert() {
    return this.page.getByRole('main').getByRole('alert');
  }

  get retryButton() {
    return this.page.getByRole('main').getByRole('button', { name: 'Réessayer' });
  }

  isOpen(): boolean {
    return new URL(this.page.url()).pathname === myProposalsPath;
  }

  async open(): Promise<void> {
    await this.page.goto(myProposalsPath);
    await this.title.waitFor();
  }

  /** The card of the proposal of this pose (its presented name). */
  card(name: string): Locator {
    return this.page.getByRole('article', { name, exact: true });
  }

  /** The status of a proposal: « Statut : Acceptée le 8 novembre 2026 ». */
  status(name: string): Locator {
    // The paragraph, whole: getByText would stop at the visually hidden span « Statut : ».
    return this.card(name).locator('p').filter({ hasText: /^Statut : / });
  }

  /** A text of the card, whole. */
  text(name: string, text: string): Locator {
    return this.card(name).getByText(text, { exact: true });
  }

  /** The value of a term of the description lists of the card (pose, adjustments). */
  value(name: string, term: string): Locator {
    return this.card(name)
      .getByRole('term')
      .filter({ hasText: new RegExp(`^${term}$`) })
      .locator('xpath=following-sibling::dd[1]');
  }
}
