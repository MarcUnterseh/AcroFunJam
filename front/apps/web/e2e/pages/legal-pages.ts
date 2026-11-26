import type { Page } from '@playwright/test';

/** Footer of every page (story « Mentions légales et confidentialité »): the legal pages and the contact address. */
export class SiteFooter {
  constructor(private readonly page: Page) {}

  get region() {
    return this.page.getByRole('contentinfo');
  }

  get legalNoticeLink() {
    return this.region.getByRole('link', { name: 'Mentions légales', exact: true });
  }

  get privacyPolicyLink() {
    return this.region.getByRole('link', { name: 'Politique de confidentialité', exact: true });
  }

  /** The address written out; its accessible name goes on with « (écrire un e-mail) ». */
  contactLink(address: string) {
    return this.region.getByRole('link', { name: new RegExp(`^${address.replace(/[.]/g, '\\.')}`) });
  }
}

/** « Mentions légales » and « Politique de confidentialité »: pages of the site, without any call to the API. */
export class LegalPages {
  static readonly paths = {
    'les mentions légales': '/mentions-legales',
    'la politique de confidentialité': '/confidentialite',
  } as const;

  static readonly titles = {
    'les mentions légales': 'Mentions légales',
    'la politique de confidentialité': 'Politique de confidentialité',
  } as const;

  constructor(private readonly page: Page) {}

  async open(which: keyof typeof LegalPages.paths): Promise<void> {
    await this.page.goto(LegalPages.paths[which]);
  }

  title(which: keyof typeof LegalPages.titles) {
    return this.page.getByRole('heading', { level: 1, name: LegalPages.titles[which] });
  }

  get content() {
    return this.page.getByRole('main');
  }

  /** The section under the heading of this anchor (« #tes-droits »). */
  section(anchor: string) {
    return this.page.locator(`section:has(> h2#${anchor})`);
  }

  /** The row of the table of the durations whose heading starts with this text. */
  durationRow(heading: string) {
    return this.page
      .getByRole('table', { name: 'Combien de temps AcroFunJam garde tes données' })
      .getByRole('row')
      .filter({ has: this.page.getByRole('rowheader', { name: new RegExp(`^${heading}`) }) });
  }
}
