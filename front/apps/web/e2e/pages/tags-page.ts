import type { TagScope } from '../support/tag-api';
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

  /** Story 9a: what the tag applies to, checked among the tiles « S'applique à » (null: none chosen). */
  async add(name: string, description: string, scope: TagScope | null = 'transitions'): Promise<void> {
    await this.addPanel.getByLabel('Nom').fill(name);
    await this.addPanel.getByLabel('Description').fill(description);
    if (scope) await this.scopeTile(this.addPanel, scope).check();
    await this.addPanel.getByRole('button', { name: "Ajouter l'étiquette" }).click();
  }

  async change(
    name: string,
    values: { name?: string; description?: string; scope?: TagScope },
  ): Promise<void> {
    const tag = this.tag(name);
    await tag.getByRole('button', { name: `Modifier ${name}` }).click();
    if (values.name !== undefined) await tag.getByLabel('Nom').fill(values.name);
    if (values.description !== undefined) await tag.getByLabel('Description').fill(values.description);
    if (values.scope !== undefined) await this.scopeTile(tag, values.scope).check();
    await tag.getByRole('button', { name: 'Enregistrer' }).click();
  }

  private scopeTile(container: Locator, scope: TagScope): Locator {
    const labels: Record<TagScope, string> = {
      poses: 'Aux poses',
      transitions: 'Aux transitions',
      'poses-and-transitions': 'Aux poses et aux transitions',
    };
    return container
      .getByRole('group', { name: "S'applique à" })
      .getByRole('radio', { name: labels[scope], exact: true });
  }

  async removeConfirming(name: string): Promise<void> {
    const tag = this.tag(name);
    await tag.getByRole('button', { name: `Retirer ${name}` }).click();
    await tag.getByRole('button', { name: "Retirer l'étiquette" }).click();
  }
}
