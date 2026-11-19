import type { Locator, Page } from '@playwright/test';

/** The difficulty levels as the site writes them, the scenarios writing them in lower case. */
const levelLabel = (level: string) => level.charAt(0).toLocaleUpperCase('fr-FR') + level.slice(1);

export type FlowCriteriaInput = {
  length: number;
  base?: string;
  flyer?: string;
  requested?: readonly string[];
  excluded?: readonly string[];
};

/** The page « Générer un flow » (story 9): its form, its flow, or why there is none. */
export class FlowGenerator {
  constructor(private readonly page: Page) {}

  readonly address = '/generer-un-flow';

  async open(): Promise<void> {
    await this.page.goto(this.address);
    await this.length.waitFor();
  }

  get length(): Locator {
    return this.page.getByRole('combobox', { name: 'Nombre de transitions' });
  }

  ceiling(role: 'base' | 'flyer'): Locator {
    return this.page.getByRole('group', { name: `Difficulté ${role}, au plus` });
  }

  group(criterion: 'requested' | 'excluded'): Locator {
    return this.page.getByRole('group', {
      name: criterion === 'requested' ? "Avec l'une de ces étiquettes" : 'Sans ces étiquettes',
    });
  }

  async openTags(): Promise<void> {
    const summary = this.page.locator('.criteria-fold__summary');
    if ((await summary.locator('xpath=..').getAttribute('open')) === null) await summary.click();
  }

  tagBox(criterion: 'requested' | 'excluded', name: string): Locator {
    return this.group(criterion)
      .locator('.tag-choice__box')
      .filter({ hasText: new RegExp(`^${name}( |$)`) });
  }

  async choose({ length, base, flyer, requested = [], excluded = [] }: FlowCriteriaInput): Promise<void> {
    await this.length.selectOption(String(length));
    if (base)
      await this.ceiling('base')
        .getByRole('radio', { name: levelLabel(base) })
        .check();
    if (flyer)
      await this.ceiling('flyer')
        .getByRole('radio', { name: levelLabel(flyer) })
        .check();
    if (requested.length + excluded.length > 0) await this.openTags();
    for (const name of requested) await this.tagBox('requested', name).getByRole('checkbox').check();
    for (const name of excluded) await this.tagBox('excluded', name).getByRole('checkbox').check();
  }

  async generate(): Promise<void> {
    await this.page.getByRole('button', { name: 'Générer un flow' }).click();
  }

  get title(): Locator {
    return this.page.getByRole('heading', { level: 1 });
  }

  get summary(): Locator {
    return this.page.locator('.flow-result__summary');
  }

  get start(): Locator {
    return this.page.locator('.flow-station--start');
  }

  get steps(): Locator {
    return this.page.getByRole('list', { name: 'Étapes du flow' }).locator(':scope > li');
  }

  step(number: number): Locator {
    return this.steps.nth(number - 1);
  }

  /** The transition of a step as shown: its name, or « Bird → Folded Leaf » without one. */
  async transitionOf(step: Locator): Promise<string> {
    const poses = step.locator('.flow-step__title .transition__poses > span');
    if ((await poses.count()) === 2) return (await poses.allTextContents()).join(' → ');
    return ((await step.locator('.flow-step__title').textContent()) ?? '')
      .replace(/^Étape \d+ · /, '')
      .trim();
  }

  async arrivalOf(step: Locator): Promise<string> {
    return (await step.locator('.flow-station .transition__other-pose-link').textContent()) ?? '';
  }

  /** The path shown: « Throne → Bird ». */
  async path(): Promise<string> {
    const names = [(await this.start.locator('.transition__other-pose-link').textContent()) ?? ''];
    for (const step of await this.steps.all()) names.push(await this.arrivalOf(step));
    return names.join(' → ');
  }

  get recap(): Locator {
    return this.page.locator('.criteria-recap');
  }

  get alert(): Locator {
    return this.page.getByRole('alert');
  }
}
