import { expect, type Locator, type Page } from '@playwright/test';
import type { ChosenVideo } from '../support/video-files';

/** What the scenario typed in the page « Ajouter une vidéo », to check that it is kept. */
export type VideoInput = {
  file: string | null;
  caption: string;
  credit: string;
  description: string;
  rights: boolean;
};

/**
 * Page object of the page « Ajouter une vidéo à Pop to Bird » (story 12, docs/design/ecrans/12-videos-des-transitions.md
 * § 3): selectors by role and accessible name, except the hidden file input and the line that sums the chosen file up.
 */
export class AddVideoForm {
  readonly input: VideoInput = { file: null, caption: '', credit: '', description: '', rights: false };

  constructor(private readonly page: Page) {}

  title(transition: string): Locator {
    return this.page.getByRole('heading', {
      level: 1,
      name: `Ajouter une vidéo à ${transition}`,
      exact: true,
    });
  }

  get form(): Locator {
    return this.page.getByRole('main').locator('form.photo-form');
  }

  get fileInput(): Locator {
    return this.form.locator('input[type="file"]');
  }

  /** « pop-to-bird.mp4 · 1 Mo · 12 secondes · 1920 × 1080 pixels ». */
  get fileSummary(): Locator {
    return this.form.locator('.photo-field__summary');
  }

  get fileError(): Locator {
    return this.form.locator('.photo-field .field__error');
  }

  get caption(): Locator {
    return this.form.getByRole('textbox', { name: 'Légende', exact: true });
  }

  get credit(): Locator {
    return this.form.getByRole('textbox', { name: 'Crédit', exact: true });
  }

  get description(): Locator {
    return this.form.getByRole('textbox', { name: /^Description de la vidéo/ });
  }

  get rights(): Locator {
    return this.form.getByRole('checkbox');
  }

  async choose(file: ChosenVideo): Promise<void> {
    await this.fileInput.setInputFiles(file);
    this.input.file = typeof file === 'string' ? file : file.name;
    await expect(this.fileSummary).toBeVisible();
  }

  async fill(values: Partial<Omit<VideoInput, 'file'>>): Promise<void> {
    if (values.caption !== undefined) await this.caption.fill(values.caption);
    if (values.credit !== undefined) await this.credit.fill(values.credit);
    if (values.description !== undefined) await this.description.fill(values.description);
    if (values.rights !== undefined) await this.rights.setChecked(values.rights);
    Object.assign(this.input, values);
  }

  async submit(): Promise<void> {
    await this.form.getByRole('button', { name: 'Ajouter la vidéo', exact: true }).click();
  }

  /** The input of the scenario is still in the form. */
  async expectKept({ file = true }: { file?: boolean } = {}): Promise<void> {
    await expect(this.caption).toHaveValue(this.input.caption);
    await expect(this.credit).toHaveValue(this.input.credit);
    await expect(this.description).toHaveValue(this.input.description);
    if (file && this.input.file) await expect(this.fileSummary).toBeVisible();
  }
}
