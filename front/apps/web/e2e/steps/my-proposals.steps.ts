import { expect, type Page } from '@playwright/test';
import { Given, Then, When } from '../fixtures';
import type { CatalogPage } from '../pages/catalog-page';
import { myProposalsPath, type MyProposalsPage } from '../pages/my-proposals-page';
import { difficultyCode } from '../support/catalog-api';
import type { IdentityApi } from '../support/identity-api';
import { defaultPassword, expectSignedIn, signInThroughTheSite } from '../support/people';

// Story 5 « Suivre mes propositions », scenarios @web of suivre-mes-propositions.feature.

/** The scenarios write the levels as domain terms (« découverte »); the site shows them capitalised. */
const displayed = (level: string) => level.charAt(0).toLocaleUpperCase('fr-FR') + level.slice(1);

const emailOf = (identityApi: IdentityApi, name: string) =>
  identityApi.people.get(name)?.email ?? `${name.toLowerCase()}@example.org`;

/** « Acceptée le 8 novembre 2026 »: a decision is dated to the day, without time. */
const onADay = /le \d{1,2} [a-zéû]+ \d{4}$/.source;

const theProposal = /la proposition de la pose "([^"]+)" par (\S+)/.source;

// --- People and decisions taken before the scenario ---------------------------------------------------

Given(/^(\S+) est validateur$/, async ({ identityApi }, name: string) => {
  const email = emailOf(identityApi, name);
  identityApi.addAccount(email, defaultPassword, 'validator');
  identityApi.people.set(name, { email, password: defaultPassword });
});

Given(/^(\S+) est connectée? sur le site$/, async ({ page, identityApi }, name: string) => {
  const person = identityApi.people.get(name);
  if (!person) throw new Error(`Personne inconnue : ${name}`);
  await signInThroughTheSite(page, person.email, person.password);
  await expectSignedIn(page, person.email);
});

// « … en corrigeant la difficulté flyer en "découverte"[, avec le message « … »] »: decided outside the site.
Given(
  new RegExp(
    `^(\\S+) a accepté ${theProposal}(?: en corrigeant (la difficulté base|la difficulté flyer) en "([^"]+)")?(?:, avec le message « (.+) »)?$`,
  ),
  async (
    { validationApi },
    _who: string,
    name: string,
    _contributor: string,
    field: string | null | undefined,
    level: string | null | undefined,
    message: string | null | undefined,
  ) => {
    const adjusted = level ? difficultyCode(level) : null;
    validationApi.acceptElsewhere(name, {
      ...(field === 'la difficulté base' && { baseDifficulty: adjusted }),
      ...(field === 'la difficulté flyer' && { flyerDifficulty: adjusted }),
      ...(message && { message }),
    });
  },
);

Given(
  new RegExp(`^(\\S+) a refusé ${theProposal} avec le motif « (.+) »$`),
  async ({ validationApi }, _who: string, name: string, _contributor: string, reason: string) => {
    validationApi.rejectElsewhere(name, reason);
  },
);

// --- Access ------------------------------------------------------------------------------------------

/**
 * From the catalog, as a person does: the entry of the page is the link « Mes propositions » (Q23). When the
 * scenario expired the session, the catalog may already have noticed it (the session is read again on focus) and
 * dropped the link: the person opens the page by its address (a bookmark), and the page tells the session expired.
 */
const openMyProposals = async (
  page: Page,
  catalogPage: CatalogPage,
  myProposalsPage: MyProposalsPage,
  sessionExpired: boolean,
) => {
  if (myProposalsPage.isOpen()) return;
  if (sessionExpired) await page.goto(myProposalsPath);
  else {
    if (!catalogPage.isOpen()) await catalogPage.open();
    await expect(catalogPage.myProposalsLink).toBeVisible();
    await catalogPage.myProposalsLink.click();
  }
  await expect(myProposalsPage.title).toBeVisible();
};

When(
  '{word} consulte ses propositions sur le site',
  async ({ page, catalogPage, myProposalsPage, identityApi }, name: string) => {
    const sessionExpired = identityApi.hasExpiredSession(emailOf(identityApi, name));
    await openMyProposals(page, catalogPage, myProposalsPage, sessionExpired);
  },
);

When('un visiteur accède directement à la page « Mes propositions »', async ({ page }) => {
  await page.goto(myProposalsPath);
});

Given(
  '{word} a accédé directement à la page « Mes propositions » en tant que visiteur',
  async ({ page, signInForm }, _name: string) => {
    await page.goto(myProposalsPath);
    await expect(signInForm.email).toBeVisible();
  },
);

When('{word} choisit de voir ses propositions', async ({ proposalForm }, _name: string) => {
  await proposalForm.seeMyProposalsLink.click();
});

Then('le catalogue invite {word} à voir ses propositions', async ({ catalogPage }, _name: string) => {
  await expect(catalogPage.myProposalsLink).toBeVisible();
  await expect(catalogPage.myProposalsLink).toHaveAttribute('href', myProposalsPath);
});

Then("le catalogue n'invite pas le visiteur à voir des propositions", async ({ catalogPage, header }) => {
  // Wait until the poses are received and the session is known: the link would only appear then.
  await expect(catalogPage.emptyCatalogMessage.or(catalogPage.poseList)).toBeVisible();
  await expect(header.account.getByRole('link', { name: 'Se connecter' })).toBeVisible();
  await expect(catalogPage.myProposalsLink).toHaveCount(0);
});

Then(
  'le site invite le visiteur à se connecter, sans lui présenter de propositions',
  async ({ page, signInForm, myProposalsPage, myProposalsApi }) => {
    await expect(signInForm.email).toBeVisible();
    await expect(
      page.getByText('Connecte-toi pour accéder à tes propositions.', { exact: true }),
    ).toBeVisible();
    expect(new URL(page.url()).searchParams.get('retour')).toBe(myProposalsPath);
    await expect(myProposalsPage.title).toHaveCount(0);
    expect(myProposalsApi.requests).toBe(0);
  },
);

Then('le site présente ses propositions à {word}', async ({ page, myProposalsPage }, _name: string) => {
  await expect(myProposalsPage.title).toBeVisible();
  expect(new URL(page.url()).pathname).toBe(myProposalsPath);
  await expect(myProposalsPage.emptyMessage.or(myProposalsPage.list)).toBeVisible();
});

Then(
  "la confirmation n'invite pas {word} à voir ses propositions",
  async ({ proposalForm }, _name: string) => {
    await expect(proposalForm.successTitle).toBeVisible();
    await expect(proposalForm.seeMyProposalsLink).toHaveCount(0);
  },
);

// --- What became of the proposals --------------------------------------------------------------------

Then(
  'le site présente à {word} sa proposition de la pose {string} en attente de validation',
  async ({ myProposalsPage }, _name: string, pose: string) => {
    await expect(myProposalsPage.status(pose)).toHaveText('Statut : En attente de validation');
    await expect(
      myProposalsPage.text(pose, 'Elle apparaîtra dans le catalogue une fois acceptée.'),
    ).toBeVisible();
  },
);

Then(
  'le site présente la proposition de la pose {string} comme acceptée et publiée dans le catalogue',
  async ({ myProposalsPage }, pose: string) => {
    await expect(myProposalsPage.status(pose)).toHaveText(new RegExp(`^Statut : Acceptée ${onADay}`));
    await expect(myProposalsPage.text(pose, 'Elle est publiée dans le catalogue.')).toBeVisible();
  },
);

Then(
  'le site présente la proposition de la pose {string} comme publiée directement dans le catalogue',
  async ({ myProposalsPage }, pose: string) => {
    await expect(myProposalsPage.status(pose)).toHaveText('Statut : Publiée directement');
    await expect(myProposalsPage.text(pose, 'Elle est publiée dans le catalogue.')).toBeVisible();
  },
);

Then(
  /^le site présente la proposition de la pose "([^"]+)" comme acceptée avec ajustements, de difficulté flyer "([^"]+)"$/,
  async ({ myProposalsPage }, pose: string, flyer: string) => {
    await expect(myProposalsPage.status(pose)).toHaveText(
      new RegExp(`^Statut : Acceptée avec ajustements ${onADay}`),
    );
    await expect(
      myProposalsPage.text(pose, 'Elle est publiée dans le catalogue avec ces ajustements.'),
    ).toBeVisible();
    await expect(myProposalsPage.value(pose, 'Flyer')).toHaveText(displayed(flyer));
  },
);

Then(
  /^le site présente la difficulté (base|flyer) proposée "([^"]+)" et retenue "([^"]+)"$/,
  async ({ myProposalsPage }, role: string, proposed: string, retained: string) => {
    const [card] = await myProposalsPage.cards.all();
    const name = await card!.getByRole('heading', { level: 2 }).innerText();
    await expect(myProposalsPage.value(name, `Difficulté ${role}`)).toHaveText(
      `Proposé : ${displayed(proposed)}, retenu : ${displayed(retained)}`,
    );
  },
);

Then("le site présente le message d'ajustement « {} »", async ({ page }, message: string) => {
  const main = page.getByRole('main');
  await expect(main.getByText("Message d'ajustement", { exact: true })).toBeVisible();
  await expect(main.getByText(message, { exact: true })).toBeVisible();
});

Then(
  /^le site présente la proposition de la pose "([^"]+)" comme refusée, avec le motif « (.+) »$/,
  async ({ myProposalsPage }, pose: string, reason: string) => {
    await expect(myProposalsPage.status(pose)).toHaveText(new RegExp(`^Statut : Refusée ${onADay}`));
    await expect(myProposalsPage.text(pose, "Elle n'est pas publiée dans le catalogue.")).toBeVisible();
    await expect(myProposalsPage.text(pose, 'Motif du refus')).toBeVisible();
    await expect(myProposalsPage.text(pose, reason)).toBeVisible();
  },
);

Then('le site invite {word} à proposer une pose', async ({ myProposalsPage }, _name: string) => {
  await expect(myProposalsPage.proposePoseLink).toBeVisible();
  await expect(myProposalsPage.proposePoseLink).toHaveAttribute('href', '/proposer-une-pose');
});

// --- Incidents ---------------------------------------------------------------------------------------

Then(
  "le site indique que les propositions n'ont pas pu être chargées et qu'{word} peut réessayer",
  async ({ myProposalsPage }, _name: string) => {
    await expect(myProposalsPage.alert).toContainText('Impossible de charger tes propositions.');
    await expect(myProposalsPage.retryButton).toBeVisible();
    // An incident never looks like an empty list.
    await expect(myProposalsPage.emptyMessage).toHaveCount(0);
  },
);

// On this page, a lasting block of the page replaces the banner of the whole site.
Then(
  /^la page « Mes propositions » informe (\S+) que sa session a expiré et qu'elle peut se connecter de nouveau$/,
  async ({ page, myProposalsPage }, _name: string) => {
    await expect(myProposalsPage.title).toBeVisible();
    const main = page.getByRole('main');
    await expect(main.getByText('Ta session a expiré.', { exact: true })).toBeVisible();
    await expect(main.getByText('Connecte-toi de nouveau pour retrouver tes propositions.')).toBeVisible();
    await expect(main.getByRole('link', { name: 'Se connecter' })).toHaveAttribute(
      'href',
      `/connexion?retour=${encodeURIComponent(myProposalsPath)}`,
    );
    await expect(page.getByRole('region', { name: 'Session expirée' })).toHaveCount(0);
    await expect(myProposalsPage.cards).toHaveCount(0);
  },
);

Then(
  /^le site ne présente plus les propositions d'(\S+)$/,
  async ({ page, myProposalsPage }, _name: string) => {
    await expect(page.getByRole('heading', { level: 1, name: 'Catalogue des poses' })).toBeVisible();
    await expect(myProposalsPage.title).toHaveCount(0);
    await expect(myProposalsPage.cards).toHaveCount(0);
  },
);
