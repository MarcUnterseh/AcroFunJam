import type { Locator, Page } from '@playwright/test';

export const tagsPath = '/etiquettes';

/**
 * Page object of « Étiquettes » (docs/design/ecrans/8-etiquettes.md): selectors by role and accessible name only.
 * Each tag is a list item headed by its name (h2); its zones (change, removal) open inside it.
 */
export class TagsPage {
  constructor(private readonly page: Page) {}

  get title() {
    return this.page.getByRole('heading', { level: 1, name: 'Étiquettes' });
  }

  get addPanel() {
    return this.page.getByRole('region', { name: 'Ajouter une étiquette' });
  }

  async open(): Promise<void> {
    await this.page.goto(tagsPath);
    await this.loaded();
  }

  /** The page is shown and its list read. */
  async loaded(): Promise<void> {
    await this.title.waitFor();
    await this.page.getByText('Chargement des étiquettes…').waitFor({ state: 'detached' });
  }

  /** The tag of this name, as presented in the list. */
  tag(name: string): Locator {
    return this.page
      .getByRole('listitem')
      .filter({ has: this.page.getByRole('heading', { level: 2, name, exact: true }) });
  }

  /** The names of the tags of the list, in order. */
  names(): Promise<string[]> {
    return this.page.locator('.tag-list > li').getByRole('heading', { level: 2 }).allTextContents();
  }

  async add(name: string, description: string): Promise<void> {
    await this.addPanel.getByLabel('Nom').fill(name);
    await this.addPanel.getByLabel('Description').fill(description);
    await this.addPanel.getByRole('button', { name: "Ajouter l'étiquette" }).click();
  }

  async change(name: string, values: { name?: string; description?: string }): Promise<void> {
    const tag = this.tag(name);
    await tag.getByRole('button', { name: `Modifier ${name}` }).click();
    if (values.name !== undefined) await tag.getByLabel('Nom').fill(values.name);
    if (values.description !== undefined) await tag.getByLabel('Description').fill(values.description);
    await tag.getByRole('button', { name: 'Enregistrer' }).click();
  }

  async removeConfirming(name: string): Promise<void> {
    const tag = this.tag(name);
    await tag.getByRole('button', { name: `Retirer ${name}` }).click();
    await tag.getByRole('button', { name: "Retirer l'étiquette" }).click();
  }
}
