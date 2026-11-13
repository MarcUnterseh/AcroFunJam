import type { Locator, Page } from '@playwright/test';

/** The path of the form « Proposer une modification » of a pose. */
export const revisionPath = (poseId: string) => `/poses/${poseId}/proposer-une-modification`;

const flowQuestions = {
  start: 'Peut-on commencer un flow sur cette pose ?',
  end: 'Peut-on terminer un flow sur cette pose ?',
} as const;

/** What a scenario changes in a pose (levels as displayed on the tiles: « Découverte »). */
export type RevisionToPropose = { name?: string; base?: string; flyer?: string; message?: string };

/**
 * Page object of « Proposer une modification » (docs/design/ecrans/6-proposer-une-modification.md): selectors by
 * role and accessible name only. The fields are prefilled with the current values of the pose.
 */
export class RevisionForm {
  constructor(private readonly page: Page) {}

  get title() {
    return this.page.getByRole('heading', { level: 1, name: 'Proposer une modification' });
  }

  get form() {
    return this.page.getByRole('form', { name: 'Proposer une modification' });
  }

  get name() {
    return this.form.getByRole('textbox', { name: 'Nom de la pose' });
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

  flowGroup(boundary: keyof typeof flowQuestions) {
    return this.group(flowQuestions[boundary]);
  }

  get alert() {
    return this.page.getByRole('main').getByRole('alert');
  }

  get successTitle() {
    return this.page.getByRole('main').getByRole('heading', { level: 2 });
  }

  /** The page is shown, the pose read: the form, or what takes its place (pending revision, unknown pose). */
  async loaded(): Promise<void> {
    await this.title.waitFor();
    await this.page.getByText('Chargement de la pose…').waitFor({ state: 'detached' });
  }

  isOpen(): boolean {
    return (
      this.page.url().startsWith('http') &&
      /\/poses\/[^/]+\/proposer-une-modification$/.test(new URL(this.page.url()).pathname)
    );
  }

  /** The level checked in a group of difficulty tiles. */
  checked(group: Locator): Locator {
    return group.getByRole('radio', { checked: true });
  }

  /** The summary « actuellement → nouveau » of a validator, before publishing. */
  get summaryTitle() {
    return this.page.getByRole('heading', { level: 2, name: 'Vérifie ta modification' });
  }

  /** What was changed last in the form. */
  lastChange: RevisionToPropose = {};

  async change(revision: RevisionToPropose): Promise<void> {
    this.lastChange = revision;
    if (revision.name !== undefined) await this.name.fill(revision.name);
    if (revision.base)
      await this.baseDifficulty.getByRole('radio', { name: revision.base, exact: true }).check();
    if (revision.flyer)
      await this.flyerDifficulty.getByRole('radio', { name: revision.flyer, exact: true }).check();
    if (revision.message !== undefined)
      await this.form.getByRole('textbox', { name: /^Message pour le validateur/ }).fill(revision.message);
  }

  /** « Proposer la modification » (a user) or « Vérifier la modification » (a validator, who then publishes). */
  async submit(): Promise<void> {
    await this.form.getByRole('button', { name: /^(Proposer|Vérifier) la modification$/ }).click();
  }

  async publish(): Promise<void> {
    await this.page.getByRole('button', { name: 'Publier la modification' }).click();
  }
}
