import type { Locator, Page } from '@playwright/test';

/** The path of the page of a published pose (story 7). */
export const posePath = (poseId: string) => `/poses/${poseId}`;

export type Direction = 'from' | 'to';

/** A transition as read on the page of a pose: the other pose, its name (empty without one), difficulties, description. */
export type DisplayedTransition = {
  otherPose: string;
  samePose: boolean;
  /** The accessible name of its title: its name, or « de Throne vers Bird » without one. */
  title: string;
  /** Whether it has a name: without one, it is presented by its poses (« Throne → Bird »). */
  named: boolean;
  /** The visible text of its title (« Throne → Bird » without a name). */
  visibleTitle: string;
  base: string;
  flyer: string;
  description: string;
  /** Story 8: the names of its tags, in the order shown. */
  tags: string[];
};

const escaped = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Page object of the page of a pose (docs/design/ecrans/7-proposer-une-transition.md): selectors by role and
 * accessible name only. Each section of transitions is named by its h2; each transition is a list item titled by
 * its h3.
 */
export class PosePage {
  constructor(private readonly page: Page) {}

  async open(poseId: string): Promise<void> {
    await this.page.goto(posePath(poseId));
  }

  isOpen(): boolean {
    return this.page.url().startsWith('http') && /^\/poses\/[^/]+$/.test(new URL(this.page.url()).pathname);
  }

  title(name: string): Locator {
    return this.page.getByRole('heading', { level: 1, name, exact: true });
  }

  get backLink(): Locator {
    return this.page.getByRole('main').getByRole('link', { name: 'Catalogue', exact: true });
  }

  /** The characteristics of the pose: the description list that follows the title. */
  get characteristics(): Locator {
    return this.page.getByRole('main').getByRole('definition');
  }

  value(term: string): Locator {
    return this.page
      .getByRole('main')
      .getByRole('term')
      .filter({ hasText: new RegExp(`^${escaped(term)}$`) })
      .first()
      .locator('xpath=following-sibling::dd[1]');
  }

  get difficultyScale(): Locator {
    return this.page.getByRole('list', { name: /^Niveaux de difficulté/ });
  }

  get responsibilityWarning(): Locator {
    return this.page.getByText(
      'Tu restes juge de tes limites. Les chutes arrivent surtout pendant les transitions : apprends-les avec un spotter.',
      { exact: true },
    );
  }

  section(direction: Direction, pose: string): Locator {
    const title = direction === 'from' ? `Transitions depuis ${pose}` : `Transitions vers ${pose}`;
    return this.page.getByRole('region', { name: title, exact: true });
  }

  /** « Proposer une transition depuis Throne » (story 7), for a person who may propose. */
  proposeTransitionLink(pose: string): Locator {
    return this.page.getByRole('link', { name: `Proposer une transition depuis ${pose}`, exact: true });
  }

  get proposeTransitionLinks(): Locator {
    return this.page.getByRole('link', { name: /^Proposer une transition depuis / });
  }

  get loadingFailure(): Locator {
    return this.page.getByRole('alert');
  }

  async retry(): Promise<void> {
    await this.page.getByRole('main').getByRole('button', { name: 'Réessayer' }).click();
  }

  /** The transition of a section titled so (its accessible name: « Ninja Star », « de Throne vers Bird »). */
  transition(direction: Direction, pose: string, title: string): Locator {
    return this.section(direction, pose)
      .getByRole('listitem')
      .filter({ has: this.page.getByRole('heading', { level: 3, name: title, exact: true }) });
  }

  /** Story 8: the pills of the line « Étiquettes » of a transition. */
  tagsOf(transition: Locator): Locator {
    return transition.getByRole('list', { name: 'Étiquettes', exact: true }).getByRole('listitem');
  }

  /** Story 8: tags a transition through its zone « Étiqueter », checking exactly these tags, then records them. */
  async tag(transition: Locator, tags: readonly string[]): Promise<void> {
    await transition.getByRole('button', { name: /^Étiqueter / }).click();
    const group = transition.getByRole('group', { name: 'Étiquettes de la transition' });
    await group.getByRole('checkbox').first().waitFor();
    // From the last to the first: a tag adding another (« pop ») is unchecked before the one it adds (« dynamique »).
    for (const box of (await group.getByRole('checkbox').all()).reverse()) await box.uncheck();
    for (const tag of tags) await group.getByRole('checkbox', { name: tag, exact: true }).check();
    await transition.getByRole('button', { name: 'Enregistrer les étiquettes' }).click();
    await group.waitFor({ state: 'detached' });
  }

  async transitions(direction: Direction, pose: string): Promise<DisplayedTransition[]> {
    const section = this.section(direction, pose);
    await section.waitFor();
    const read: DisplayedTransition[] = [];
    // The transitions only: the pills of their tags are list items too (story 8).
    const items = section
      .getByRole('listitem')
      .filter({ has: this.page.getByRole('heading', { level: 3 }) });
    for (const item of await items.all()) read.push(await this.readItem(item));
    return read;
  }

  private async readItem(item: Locator): Promise<DisplayedTransition> {
    const heading = item.getByRole('heading', { level: 3 });
    // The accessible name of the title, as an assistive technology reads it (the arrow is hidden from it).
    const snapshot = await heading.ariaSnapshot();
    const title = /heading "(.*)" \[level=3\]/.exec(snapshot)?.[1] ?? '';
    // Without a name, the visible title « Throne → Bird » is hidden from assistive technologies.
    const byPoses = heading.locator('[aria-hidden="true"]');
    const named = (await byPoses.count()) === 0;
    // The arrow is an icon: read as « → » between the names of the poses.
    const visibleTitle = named
      ? title
      : await byPoses.first().evaluate((element) =>
          Array.from(element.childNodes)
            .map((node) => (node.nodeName.toLowerCase() === 'svg' ? '→' : (node.textContent ?? '').trim()))
            .filter(Boolean)
            .join(' '),
        );
    const otherPoseLine = item.getByRole('paragraph').filter({ has: this.page.getByRole('link') });
    const terms = await item.getByRole('term').allInnerTexts();
    const values = await item.getByRole('definition').allInnerTexts();
    const valueOf = (term: string) => (values[terms.indexOf(term)] ?? '').trim();
    const description = item.getByRole('paragraph').filter({ hasNot: this.page.getByRole('link') });
    return {
      otherPose: (await otherPoseLine.getByRole('link').innerText()).trim(),
      samePose: (await otherPoseLine.innerText()).includes('(même pose)'),
      title,
      named,
      visibleTitle,
      base: valueOf('Base'),
      flyer: valueOf('Flyer'),
      description: (await description.count()) ? (await description.innerText()).trim() : '',
      tags: (await this.tagsOf(item).allInnerTexts()).map((tag) => tag.trim()),
    };
  }
}
