import type { Page } from '@playwright/test';

/** What a scenario states of a pose to propose; what it does not state gets a neutral valid value. */
export type PoseToPropose = {
  name?: string;
  /** Levels as displayed on the tiles (« Débutant »); null: left unanswered. */
  base?: string | null;
  flyer?: string | null;
  canStartFlow?: boolean | null;
  canEndFlow?: boolean | null;
};

const flowQuestions = {
  start: 'Peut-on commencer un flow sur cette pose ?',
  end: 'Peut-on terminer un flow sur cette pose ?',
} as const;

/** Page object of « Proposer une pose »: selectors by role and accessible name only. */
export class ProposalForm {
  constructor(private readonly page: Page) {}

  get form() {
    return this.page.getByRole('form', { name: 'Proposer une pose' });
  }

  get name() {
    return this.form.getByRole('textbox', { name: 'Nom de la pose' });
  }

  group(legend: string) {
    return this.form.getByRole('group', { name: legend });
  }

  get baseDifficulty() {
    return this.group('Difficulté base');
  }

  get flyerDifficulty() {
    return this.group('Difficulté flyer');
  }

  flowGroup(boundary: keyof typeof flowQuestions) {
    return this.group(flowQuestions[boundary]);
  }

  get radios() {
    return this.form.getByRole('radio');
  }

  get alert() {
    return this.page.getByRole('alert');
  }

  get successTitle() {
    return this.page.getByRole('heading', { level: 2 });
  }

  /** The page of the form is the one displayed (the form itself may still be loading). */
  isOpen(): boolean {
    return new URL(this.page.url()).pathname === '/proposer-une-pose';
  }

  async open(): Promise<void> {
    await this.page.goto('/proposer-une-pose');
    await this.name.waitFor();
  }

  /** What was filled in last, defaults included. */
  lastFilled: PoseToPropose = {};

  async fill(pose: PoseToPropose): Promise<void> {
    const {
      name = 'Throne',
      base = 'Débutant',
      flyer = 'Découverte',
      canStartFlow = true,
      canEndFlow = true,
    } = pose;
    this.lastFilled = { name, base, flyer, canStartFlow, canEndFlow };
    await this.name.fill(name);
    if (base !== null) await this.baseDifficulty.getByRole('radio', { name: base, exact: true }).check();
    if (flyer !== null) await this.flyerDifficulty.getByRole('radio', { name: flyer, exact: true }).check();
    if (canStartFlow !== null)
      await this.flowGroup('start')
        .getByRole('radio', { name: canStartFlow ? 'Oui' : 'Non' })
        .check();
    if (canEndFlow !== null)
      await this.flowGroup('end')
        .getByRole('radio', { name: canEndFlow ? 'Oui' : 'Non' })
        .check();
  }

  async submit(): Promise<void> {
    await this.form.getByRole('button', { name: 'Proposer la pose' }).click();
  }

  async proposeAnother(): Promise<void> {
    await this.page.getByRole('button', { name: 'Proposer une autre pose' }).click();
  }

  async seeCatalog(): Promise<void> {
    await this.page.getByRole('link', { name: 'Voir le catalogue' }).click();
  }
}
