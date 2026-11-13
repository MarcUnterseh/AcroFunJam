import type { Locator, Page } from '@playwright/test';

/** The path of the form « Proposer une transition » from a pose. */
export const transitionPath = (poseId: string) => `/poses/${poseId}/proposer-une-transition`;

/** What a scenario states of a transition to propose (poses by name, levels as displayed: « Débutant »). */
export type TransitionToPropose = {
  /** The departure pose to choose; undefined keeps the prefilled one. */
  from?: string | undefined;
  /** The arrival pose to choose; null leaves « Choisis une pose ». */
  to?: string | null;
  name?: string;
  base?: string;
  flyer?: string;
  description?: string;
};

/**
 * Page object of « Proposer une transition » (docs/design/ecrans/7-proposer-une-transition.md): selectors by role and
 * accessible name only.
 */
export class TransitionForm {
  constructor(private readonly page: Page) {}

  get title() {
    return this.page.getByRole('heading', { level: 1, name: 'Proposer une transition' });
  }

  get form() {
    return this.page.getByRole('form', { name: 'Proposer une transition' });
  }

  get fromPose() {
    return this.form.getByRole('combobox', { name: 'Pose de départ' });
  }

  get toPose() {
    return this.form.getByRole('combobox', { name: "Pose d'arrivée" });
  }

  get name() {
    return this.form.getByRole('textbox', { name: 'Nom de la transition (facultatif)' });
  }

  get description() {
    return this.form.getByRole('textbox', { name: 'Description (facultative)' });
  }

  group(legend: string): Locator {
    return this.form.getByRole('group', { name: legend });
  }

  get baseDifficulty() {
    return this.group('Difficulté base');
  }

  get flyerDifficulty() {
    return this.group('Difficulté flyer');
  }

  get alert() {
    return this.page.getByRole('main').getByRole('alert');
  }

  get successTitle() {
    return this.page.getByRole('main').getByRole('heading', { level: 2 });
  }

  isOpen(): boolean {
    return (
      this.page.url().startsWith('http') &&
      /\/poses\/[^/]+\/proposer-une-transition$/.test(new URL(this.page.url()).pathname)
    );
  }

  /** The page is shown, the poses read: the form, or what takes its place (pose gone). */
  async loaded(): Promise<void> {
    await this.title.waitFor();
    await this.page.getByText('Chargement des poses…').waitFor({ state: 'detached' });
  }

  /** The name of the option selected in a drop-down list. */
  async selected(list: Locator): Promise<string> {
    return (await list.locator('option:checked').innerText()).trim();
  }

  /** What was filled in last, defaults included. */
  lastFilled: TransitionToPropose = {};

  async fill(transition: TransitionToPropose): Promise<void> {
    const {
      from,
      to = 'Bird',
      name = '',
      base = 'Débutant',
      flyer = 'Débutant',
      description = '',
    } = transition;
    this.lastFilled = { from, to, name, base, flyer, description };
    if (from !== undefined) await this.fromPose.selectOption({ label: from });
    if (to !== null) await this.toPose.selectOption({ label: to });
    await this.name.fill(name);
    await this.baseDifficulty.getByRole('radio', { name: base, exact: true }).check();
    await this.flyerDifficulty.getByRole('radio', { name: flyer, exact: true }).check();
    await this.description.fill(description);
  }

  async submit(): Promise<void> {
    await this.form.getByRole('button', { name: 'Proposer la transition' }).click();
  }

  async cancel(): Promise<void> {
    await this.form.getByRole('link', { name: 'Annuler' }).click();
  }
}
