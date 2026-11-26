import { expect, type Page } from '@playwright/test';
import { Then, When } from '../fixtures';
import { LegalPages, SiteFooter } from '../pages/legal-pages';
import type { CatalogApi } from '../support/catalog-api';

// Story « Mentions légales et confidentialité » (specs/features/informations-legales).

type LegalPage = keyof typeof LegalPages.paths;

/** The pages a visitor consults in the scenarios of the footer, by their wording. */
const visitorPages: Record<string, (page: Page, catalogApi: CatalogApi) => Promise<unknown>> = {
  'la page de la pose publiée "Throne"': async (page, catalogApi) => {
    catalogApi.publish({ name: 'Throne' });
    await page.goto(`/poses/${catalogApi.poseNamed('Throne').id}`);
    await expect(page.getByRole('heading', { level: 1, name: 'Throne' })).toBeVisible();
  },
  'la page de la pose introuvable "Inconnue"': async (page) => {
    await page.goto(`/poses/${crypto.randomUUID()}`);
    await expect(page.getByRole('heading', { level: 1, name: 'Pose introuvable' })).toBeVisible();
  },
  'la page « Générer un flow »': (page) => page.goto('/generer-un-flow'),
  'la page « Étiquettes »': (page) => page.goto('/etiquettes'),
  'la page « Se connecter »': (page) => page.goto('/connexion'),
  "la page « S'inscrire »": (page) => page.goto('/inscription'),
  'une page introuvable': (page) => page.goto('/une/page/inconnue'),
  'les mentions légales': (page) => page.goto(LegalPages.paths['les mentions légales']),
  'la politique de confidentialité': (page) => page.goto(LegalPages.paths['la politique de confidentialité']),
};

/** The pages of a signed-in person, by their wording. */
const signedInPages: Record<string, string> = {
  '« Mes propositions »': '/mes-propositions',
  'le formulaire « Proposer une pose »': '/proposer-une-pose',
};

const alternatives = (wordings: readonly string[]) =>
  wordings.map((wording) => wording.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');

// « les poses du catalogue » has its own step (catalog.steps.ts).
When(
  new RegExp(`^un visiteur consulte (${alternatives(Object.keys(visitorPages))})$`),
  async ({ page, catalogApi }, wording: string) => {
    await visitorPages[wording]!(page, catalogApi);
  },
);

When(
  new RegExp(`^(\\w+) consulte (${alternatives(Object.keys(signedInPages))})$`),
  async ({ page }, _name: string, wording: string) => {
    await page.goto(signedInPages[wording]!);
  },
);

When('un visiteur consulte les poses du catalogue pour la première fois', async ({ page }) => {
  await page.goto('/');
});

When(
  /^un visiteur arrive sur le site directement par (les mentions légales|la politique de confidentialité)$/,
  async ({ page }, which: LegalPage) => new LegalPages(page).open(which),
);

When("une personne ouvre la page « S'inscrire »", async ({ page }) => {
  await page.goto('/inscription');
});

Then(
  "le pied de page mène aux mentions légales, à la politique de confidentialité et à l'adresse de contact {string}",
  async ({ page }, address: string) => {
    const footer = new SiteFooter(page);
    await expect(footer.legalNoticeLink).toHaveAttribute('href', LegalPages.paths['les mentions légales']);
    await expect(footer.privacyPolicyLink).toHaveAttribute('href', LegalPages.paths['la politique de confidentialité']);
    await expect(footer.contactLink(address)).toHaveAttribute('href', `mailto:${address}`);
  },
);

Then(
  /^le site présente (les mentions légales|la politique de confidentialité) sans lui demander de se connecter$/,
  async ({ page }, which: LegalPage) => {
    await expect(new LegalPages(page).title(which)).toBeVisible();
    await expect(page).toHaveURL(LegalPages.paths[which]);
    await expect(page.getByRole('form', { name: 'Se connecter' })).toHaveCount(0);
  },
);

Then(
  /^les mentions légales présentent (l'éditeur|l'hébergeur du site|l'adresse de contact) : "([^"]+)"$/,
  async ({ page }, rubric: string, content: string) => {
    const legal = new LegalPages(page);
    const anchor = {
      "l'éditeur": 'editeur',
      "l'hébergeur du site": 'hebergement-du-site',
      "l'adresse de contact": 'contact',
    }[rubric]!;
    await expect(legal.section(anchor)).toContainText(content);
  },
);

/** Headings of the rows of the table of durations, by the wording of the data in the scenarios. */
const durationRows: Record<string, { heading: string; details: readonly string[] }> = {
  'les données du compte : adresse e-mail, mot de passe haché, rôle': {
    heading: 'Ton compte',
    details: ['adresse e-mail', 'mot de passe', 'rôle'],
  },
  'les propositions et les décisions': { heading: 'Tes propositions', details: ['décisions'] },
  'la confirmation des droits sur une photo : compte et date': {
    heading: 'La confirmation des droits',
    details: ['compte', 'date'],
  },
  'les photos, leur crédit et leur texte alternatif': {
    heading: 'Les photos',
    details: ['crédit', 'texte alternatif'],
  },
  'le cookie de session': { heading: 'Le cookie de session', details: [] },
  'les sauvegardes de la base de données': { heading: 'Les sauvegardes', details: [] },
};

Then(
  /^la politique de confidentialité présente (.+), conservées "([^"]+)"$/,
  async ({ page }, data: string, duration: string) => {
    const { heading, details } = durationRows[data]!;
    const row = new LegalPages(page).durationRow(heading);
    await expect(row).toHaveCount(1);
    await expect(row).toContainText(new RegExp(duration.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
    for (const detail of details) await expect(row).toContainText(detail);
  },
);

Then(
  'la politique de confidentialité nomme le sous-traitant {string}, qui héberge {}',
  async ({ page }, processor: string, hosted: string) => {
    const item = new LegalPages(page)
      .section('ou-sont-tes-donnees')
      .getByRole('listitem')
      .filter({ hasText: processor });
    await expect(item).toContainText(hosted);
  },
);

Then(
  "la politique de confidentialité indique que seul le cookie de session, strictement nécessaire, est déposé, sans mesure d'audience ni traceur",
  async ({ page }) => {
    const section = new LegalPages(page).section('cookie-et-stockage');
    await expect(section).toContainText('seul cookie');
    await expect(section).toContainText('strictement nécessaire');
    await expect(section).toContainText("Aucune mesure d'audience");
    await expect(section).toContainText('traceur');
  },
);

Then('le site ne lui demande aucun consentement aux cookies', async ({ page }) => {
  await expect(page.getByRole('heading', { level: 1, name: 'Catalogue des poses' })).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByText(/accepter les cookies|consentement/i)).toHaveCount(0);
});

/** The section that explains each request, and words it must hold. */
const requests: Record<string, { anchor: string; words: readonly string[] }> = {
  'accéder à ses données, les rectifier ou les faire effacer': {
    anchor: 'tes-droits',
    words: ['accéder', 'corriger', 'effacer'],
  },
  "s'opposer à un traitement ou le limiter": { anchor: 'tes-droits', words: ["t'opposer", 'limiter'] },
  'faire supprimer son compte': { anchor: 'supprimer-ton-compte', words: ['supprimer ton compte'] },
  "faire retirer une photo où l'on figure, sans compte, une seule demande de la base ou du flyer suffisant": {
    anchor: 'retirer-une-photo',
    words: ['une seule demande', 'base', 'flyer', 'sans compte'],
  },
};

Then(
  "la politique de confidentialité indique qu'on peut {} en écrivant à {string}",
  async ({ page }, request: string, address: string) => {
    const { anchor, words } = requests[request]!;
    const section = new LegalPages(page).section(anchor);
    for (const word of words) await expect(section).toContainText(word);
    await expect(section.locator(`a[href="mailto:${address}"]`).first()).toBeVisible();
  },
);

Then(
  "la politique de confidentialité indique qu'on peut adresser une réclamation à la CNIL",
  async ({ page }) => {
    const section = new LegalPages(page).section('reclamation-cnil');
    await expect(section).toContainText('réclamation');
    await expect(section.getByRole('link', { name: /CNIL/ })).toHaveAttribute(
      'href',
      /^https:\/\/www\.cnil\.fr/,
    );
  },
);

Then("le pied de page présente l'adresse {string} en toutes lettres", async ({ page }, address: string) => {
  const contact = new SiteFooter(page).contactLink(address);
  await expect(contact).toBeVisible();
  await expect(contact).toContainText(address);
});

Then(
  "l'adresse de contact prépare un message à {string} dans sa messagerie",
  async ({ page }, address: string) => {
    await expect(new SiteFooter(page).contactLink(address)).toHaveAttribute('href', `mailto:${address}`);
  },
);

Then('la page mène à la politique de confidentialité avant le champ « Adresse e-mail »', async ({ page }) => {
  const link = page.getByRole('main').getByRole('link', { name: 'politique de confidentialité' });
  await expect(link).toHaveAttribute('href', LegalPages.paths['la politique de confidentialité']);
  const email = page.getByRole('form', { name: "S'inscrire" }).getByLabel('Adresse e-mail');
  const precedes = await link.evaluate(
    (anchor, field) => !!(anchor.compareDocumentPosition(field as Node) & Node.DOCUMENT_POSITION_FOLLOWING),
    await email.elementHandle(),
  );
  expect(precedes).toBe(true);
});
