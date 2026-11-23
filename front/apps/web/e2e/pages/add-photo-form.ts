import { expect, type Locator, type Page } from '@playwright/test';
import type { ChosenFile } from '../support/photo-files';

/** What the scenario typed in the page « Ajouter une photo », to check that it is kept. */
export type PhotoInput = { file: string | null; altText: string; credit: string; rights: boolean };

/**
 * Page object of the page « Ajouter une photo de Throne » (story 10, docs/design/ecrans/10-photos-des-poses.md § 4):
 * selectors by role and accessible name, except the hidden file input and the line that sums the chosen file up.
 */
export class AddPhotoForm {
  /** The input of the scenario, as typed. */
  readonly input: PhotoInput = { file: null, altText: '', credit: '', rights: false };

  constructor(private readonly page: Page) {}

  title(pose: string): Locator {
    return this.page.getByRole('heading', { level: 1, name: `Ajouter une photo de ${pose}`, exact: true });
  }

  get form(): Locator {
    return this.page.getByRole('main').locator('form.photo-form');
  }

  get fileInput(): Locator {
    return this.form.locator('input[type="file"]');
  }

  /** « photo.jpg · 2 Mo · 1600 × 1200 pixels »: shown once the browser examined the chosen file. */
  get fileSummary(): Locator {
    return this.form.locator('.photo-field__summary');
  }

  /** The error under the field « Photo ». */
  get fileError(): Locator {
    return this.form.locator('.photo-field .field__error');
  }

  get altText(): Locator {
    return this.form.getByRole('textbox', { name: 'Texte alternatif', exact: true });
  }

  get credit(): Locator {
    return this.form.getByRole('textbox', { name: 'Crédit', exact: true });
  }

  get rights(): Locator {
    return this.form.getByRole('checkbox');
  }

  async choose(file: ChosenFile): Promise<void> {
    await this.fileInput.setInputFiles(file);
    this.input.file = file.name;
    await expect(this.fileSummary).toContainText(file.name);
  }

  async fill({
    altText,
    credit,
    rights,
  }: {
    altText?: string | undefined;
    credit?: string | undefined;
    rights?: boolean | undefined;
  }): Promise<void> {
    if (altText !== undefined) {
      await this.altText.fill(altText);
      this.input.altText = altText;
    }
    if (credit !== undefined) {
      await this.credit.fill(credit);
      this.input.credit = credit;
    }
    if (rights !== undefined) {
      await this.rights.setChecked(rights);
      this.input.rights = rights;
    }
  }

  async submit(): Promise<void> {
    await this.form.getByRole('button', { name: 'Ajouter la photo', exact: true }).click();
  }

  async cancel(): Promise<void> {
    await this.form.getByRole('button', { name: 'Annuler', exact: true }).click();
  }

  /** The input of the scenario is still in the form. */
  async expectKept(): Promise<void> {
    await expect(this.altText).toHaveValue(this.input.altText);
    await expect(this.credit).toHaveValue(this.input.credit);
    if (this.input.rights) await expect(this.rights).toBeChecked();
    else await expect(this.rights).not.toBeChecked();
    if (this.input.file) await expect(this.fileSummary).toContainText(this.input.file);
    else await expect(this.fileSummary).toHaveCount(0);
  }
}
