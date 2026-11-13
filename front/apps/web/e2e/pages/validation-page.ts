import type { Locator, Page } from '@playwright/test';

export const validationPath = '/propositions-a-valider';

/** A pose as presented on a proposal card: each term of its description list and its value. */
export type PresentedProposal = {
  contributor: string;
  base: string;
  flyer: string;
  commencer: string;
  terminer: string;
};

/** What a validator corrects before accepting (values as displayed: « Découverte », « Oui »). */
export type Adjustment = {
  name?: string;
  base?: string;
  flyer?: string;
  canStartFlow?: boolean;
  canEndFlow?: boolean;
};

const escaped = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Page object of « Propositions à valider » (docs/design/ecrans/4-valider-une-proposition.md): selectors by
 * role and accessible name only. Each proposal is an article named by its h2 (the proposed name); its decision
 * zones open inside it, and a decided proposal is replaced in its list item by a report (h2 « La pose « … » … »).
 */
export class ValidationPage {
  constructor(private readonly page: Page) {}

  get title() {
    return this.page.getByRole('heading', { level: 1, name: 'Propositions à valider' });
  }

  get emptyQueueMessage() {
    return this.page.getByText("Aucune proposition n'est en attente de validation.", { exact: true });
  }

  isOpen(): boolean {
    return new URL(this.page.url()).pathname === validationPath;
  }

  async open(): Promise<void> {
    await this.page.goto(validationPath);
    await this.title.waitFor();
  }

  /** The card of the proposal of this pose (its proposed name). */
  card(name: string): Locator {
    return this.page.getByRole('article', { name, exact: true });
  }

  /** The card of the revision proposal of this pose (story 6): « Modification de Throne ». */
  revisionCard(name: string): Locator {
    return this.page.getByRole('article', { name: `Modification de ${name}`, exact: true });
  }

  /** The value of a term of the description lists of a card (the pose, a summary of changes). */
  valueIn(card: Locator, term: string): Locator {
    return card
      .getByRole('term')
      .filter({ hasText: new RegExp(`^${escaped(term)}$`) })
      .locator('xpath=following-sibling::dd[1]');
  }

  /** The report that replaced the card of a decided proposal. */
  report(name: string): Locator {
    return this.page.getByRole('heading', { level: 2, name: new RegExp(`« ${escaped(name)} »`) });
  }

  /** The list item of the proposal, card or report. */
  item(name: string): Locator {
    return this.page
      .getByRole('listitem')
      .filter({ has: this.page.getByRole('heading', { level: 2, name: new RegExp(escaped(name)) }) });
  }

  alertIn(name: string): Locator {
    return this.item(name).getByRole('alert');
  }

  decisionButtons(name: string): Locator {
    return this.item(name).getByRole('button', { name: /^(Accepter et publier|Refuser)$/ });
  }

  reasonField(name: string): Locator {
    return this.card(name).getByRole('textbox', { name: 'Motif du refus' });
  }

  async presented(name: string): Promise<PresentedProposal> {
    const card = this.card(name);
    await card.waitFor();
    const terms = await card.getByRole('term').allInnerTexts();
    const values = await card.getByRole('definition').allInnerTexts();
    const valueOf = (term: string) => (values[terms.indexOf(term)] ?? '').trim();
    return {
      contributor: (await card.getByText(/^Proposée par /).innerText()).trim(),
      base: valueOf('Base'),
      flyer: valueOf('Flyer'),
      commencer: valueOf('Peut commencer un flow'),
      terminer: valueOf('Peut terminer un flow'),
    };
  }

  async accept(name: string): Promise<void> {
    await this.card(name).getByRole('button', { name: 'Accepter et publier' }).click();
  }

  async reject(name: string, reason: string): Promise<void> {
    const card = this.card(name);
    await card.getByRole('button', { name: 'Refuser' }).click();
    await this.reasonField(name).fill(reason);
    await card.getByRole('button', { name: 'Confirmer le refus' }).click();
  }

  /** Opens the adjustment zone, corrects the stated values, then asks to check them. */
  async adjust(name: string, adjustment: Adjustment): Promise<void> {
    const card = this.card(name);
    await card.getByRole('button', { name: 'Ajuster avant de publier' }).click();
    if (adjustment.name !== undefined)
      await card.getByRole('textbox', { name: 'Nom de la pose' }).fill(adjustment.name);
    const choose = async (legend: string, option: string) =>
      card.getByRole('group', { name: legend }).getByRole('radio', { name: option, exact: true }).check();
    if (adjustment.base) await choose('Difficulté base', adjustment.base);
    if (adjustment.flyer) await choose('Difficulté flyer', adjustment.flyer);
    if (adjustment.canStartFlow !== undefined)
      await choose('Peut-on commencer un flow sur cette pose ?', adjustment.canStartFlow ? 'Oui' : 'Non');
    if (adjustment.canEndFlow !== undefined)
      await choose('Peut-on terminer un flow sur cette pose ?', adjustment.canEndFlow ? 'Oui' : 'Non');
    await card.getByRole('button', { name: 'Vérifier les ajustements' }).click();
  }

  /** From the summary « proposé → retenu »: the optional message, then the sending. */
  async publishAdjusted(name: string, message?: string): Promise<void> {
    const card = this.card(name);
    await card.getByRole('heading', { level: 3, name: 'Vérifie tes ajustements' }).waitFor();
    if (message !== undefined)
      await card.getByRole('textbox', { name: /^Message pour le contributeur/ }).fill(message);
    await card.getByRole('button', { name: 'Publier avec ces ajustements' }).click();
  }
}
