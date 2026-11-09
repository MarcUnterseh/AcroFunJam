import { expect } from '@playwright/test';
import { checkPoseName } from '@acrofunjam/core';
import { Given, Then, When } from '../fixtures';
import { validationPath, type Adjustment, type ValidationPage } from '../pages/validation-page';
import { difficultyCode, type DifficultyCode } from '../support/catalog-api';
import type { IdentityApi } from '../support/identity-api';
import { defaultPassword, expectSignedIn, signInThroughTheSite } from '../support/people';
import { beforeTheIncidents, type SimulatedApis } from '../support/reachability';

// Story 4 « Valider une proposition », scenarios @web of valider-une-proposition.feature.

/** The scenarios write the levels as domain terms (« découverte »); the site shows them capitalised. */
const displayed = (level: string) => level.charAt(0).toLocaleUpperCase('fr-FR') + level.slice(1);

const emailOf = (identityApi: IdentityApi, name: string) =>
  identityApi.people.get(name)?.email ?? `${name.toLowerCase()}@example.org`;

type World = SimulatedApis & { validationPage: ValidationPage };

/** Acts on the card of a proposal; opens the page first if needed, as it was before the incidents of the scenario. */
const onTheCardOf = async ({ validationPage, ...apis }: World, name: string, action: () => Promise<void>) => {
  if (!validationPage.isOpen()) await beforeTheIncidents(apis, () => validationPage.open());
  await expect(validationPage.card(name)).toBeVisible();
  await action();
};

const escaped = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const aPose = /"([^"]+)" de difficulté base "([^"]+)" et de difficulté flyer "([^"]+)"/.source;
const theProposal = /la proposition de la pose "([^"]+)" par (\S+)/.source;
const fields: Record<string, (value: string) => Adjustment> = {
  'le nom': (name) => ({ name }),
  'la difficulté base': (level) => ({ base: displayed(level) }),
  'la difficulté flyer': (level) => ({ flyer: displayed(level) }),
};

// --- People and proposals made before the scenario ------------------------------------------------

Given(/^(\S+) est utilisateur$/, async ({ identityApi }, name: string) => {
  const email = emailOf(identityApi, name);
  identityApi.addAccount(email, defaultPassword);
  identityApi.people.set(name, { email, password: defaultPassword });
});

Given(
  /^(\S+) est utilisateur avec l'adresse "([^"]+)"$/,
  async ({ identityApi }, name: string, email: string) => {
    identityApi.addAccount(email, defaultPassword);
    identityApi.people.set(name, { email, password: defaultPassword });
  },
);

Given(
  "{word} est validateur avec l'adresse {string} et le mot de passe {string}",
  async ({ identityApi }, name: string, email: string, password: string) => {
    identityApi.addAccount(email, password, 'validator');
    identityApi.people.set(name, { email, password });
  },
);

Given(
  /^(\S+) est devenue? validateur, connectée? sur le site$/,
  async ({ page, identityApi }, name: string) => {
    const email = emailOf(identityApi, name);
    if (identityApi.people.has(name)) identityApi.setRole(email, 'validator');
    else identityApi.addAccount(email, defaultPassword, 'validator');
    identityApi.people.set(name, { email, password: defaultPassword });
    await signInThroughTheSite(page, email, defaultPassword);
    await expectSignedIn(page, email);
  },
);

Given(
  new RegExp(`^(\\S+) a proposé la pose ${aPose}$`),
  async ({ identityApi, contributionApi }, name: string, pose: string, base: string, flyer: string) => {
    contributionApi.addPending({
      name: pose,
      baseDifficulty: difficultyCode(base),
      flyerDifficulty: difficultyCode(flyer),
      canStartFlow: true,
      canEndFlow: true,
      contributorEmail: emailOf(identityApi, name),
    });
  },
);

Given(
  /^(\S+) a proposé la pose "([^"]+)" qui (peut|ne peut pas) commencer un flow et (peut|ne peut pas) terminer un flow$/,
  async ({ identityApi, contributionApi }, name: string, pose: string, start: string, end: string) => {
    // Hand-to-Hand (L-base), the example of the scenarios: advanced for both roles (expert acroyoga).
    const advanced: DifficultyCode = 'advanced';
    contributionApi.addPending({
      name: pose,
      baseDifficulty: advanced,
      flyerDifficulty: advanced,
      canStartFlow: start === 'peut',
      canEndFlow: end === 'peut',
      contributorEmail: emailOf(identityApi, name),
    });
  },
);

Given("aucune proposition n'est en attente de validation", async ({ validationApi }) => {
  expect(validationApi.queue).toEqual([]);
});

// --- Header ------------------------------------------------------------------------------------------

Then("l'en-tête invite {word} à consulter les propositions à valider", async ({ header }, _name: string) => {
  await expect(header.validationLink).toBeVisible();
  await expect(header.validationLink).toHaveAttribute('href', validationPath);
});

Then(
  "l'en-tête invite {word} à consulter les propositions à valider, sans annoncer de nombre",
  async ({ header, validationApi }, _name: string) => {
    await expect(header.validationLink).toBeVisible();
    // The count is hidden while unknown too: wait until the site asked for it.
    await expect.poll(() => validationApi.countRequests).toBeGreaterThan(0);
    await expect(header.validationLink).toHaveAccessibleName('Propositions à valider');
  },
);

Then(
  "l'en-tête n'invite pas {word} à consulter les propositions à valider",
  async ({ page, header, identityApi }, name: string) => {
    // Wait until the session is known: the link would only appear then.
    await expectSignedIn(page, emailOf(identityApi, name));
    await expect(header.contribution).toHaveCount(0);
    await expect(page.getByRole('link', { name: /Propositions à valider/ })).toHaveCount(0);
  },
);

Then(/^l'en-tête annonce (\d+) propositions? à valider$/, async ({ header }, count: string) => {
  await expect(header.validationLink).toHaveAccessibleName(`Propositions à valider (${count} en attente)`);
});

// --- Access to the page ------------------------------------------------------------------------------

When(/^(?:un visiteur|\S+) accède directement à la page « Propositions à valider »$/, async ({ page }) => {
  await page.goto(validationPath);
});

Given(
  '{word} a accédé directement à la page « Propositions à valider » en tant que visiteur',
  async ({ page, signInForm }, _name: string) => {
    await page.goto(validationPath);
    await expect(signInForm.email).toBeVisible();
  },
);

Then(
  'le site invite le visiteur à se connecter, sans lui présenter la file de validation',
  async ({ page, signInForm, validationPage }) => {
    await expect(signInForm.email).toBeVisible();
    expect(new URL(page.url()).searchParams.get('retour')).toBe(validationPath);
    await expect(validationPage.title).toHaveCount(0);
  },
);

Then('le site présente la file de validation à {word}', async ({ page, validationPage }, _name: string) => {
  await expect(validationPage.title).toBeVisible();
  expect(new URL(page.url()).pathname).toBe(validationPath);
});

Then(
  'le site présente le catalogue à {word}, sans la file de validation',
  async ({ page, validationPage }, _name: string) => {
    await expect(page.getByRole('heading', { level: 1, name: 'Catalogue des poses' })).toBeVisible();
    expect(new URL(page.url()).pathname).toBe('/');
    await expect(validationPage.title).toHaveCount(0);
  },
);

// --- Consulting the queue ----------------------------------------------------------------------------

When('{word} consulte la file de validation sur le site', async ({ validationPage }, _name: string) => {
  await validationPage.open();
});

When(
  '{word} consulte de nouveau la file de validation sur le site',
  async ({ validationPage }, _name: string) => {
    await validationPage.open();
  },
);

Then(
  /^le site présente la proposition de la pose "([^"]+)" par "([^"]+)", qui (peut|ne peut pas) commencer un flow et (peut|ne peut pas) terminer un flow$/,
  async ({ validationPage }, name: string, email: string, start: string, end: string) => {
    const proposal = await validationPage.presented(name);
    expect(proposal.contributor).toMatch(new RegExp(`^Proposée par ${escaped(email)} le `));
    expect({ commencer: proposal.commencer, terminer: proposal.terminer }).toEqual({
      commencer: start === 'peut' ? 'Oui' : 'Non',
      terminer: end === 'peut' ? 'Oui' : 'Non',
    });
  },
);

Then(
  'le site présente la proposition de la pose {string} comme proposée par toi',
  async ({ validationPage }, name: string) => {
    expect((await validationPage.presented(name)).contributor).toMatch(/^Proposée par toi le /);
  },
);

Then("le site indique qu'aucune proposition n'est en attente de validation", async ({ validationPage }) => {
  await expect(validationPage.emptyQueueMessage).toBeVisible();
});

// --- Deciding ------------------------------------------------------------------------------------------

When(
  new RegExp(`^(\\S+) accepte sur le site ${theProposal}$`),
  async (
    { validationPage, identityApi, catalogApi, contributionApi },
    _who: string,
    name: string,
    _contributor: string,
  ) => {
    const world = { validationPage, identityApi, catalogApi, contributionApi };
    await onTheCardOf(world, name, () => validationPage.accept(name));
  },
);

Given(
  new RegExp(`^(\\S+) a accepté sur le site ${theProposal}$`),
  async (
    { validationPage, identityApi, catalogApi, contributionApi },
    _who: string,
    name: string,
    _contributor: string,
  ) => {
    const world = { validationPage, identityApi, catalogApi, contributionApi };
    await onTheCardOf(world, name, () => validationPage.accept(name));
    await expect(validationPage.report(name)).toBeVisible();
  },
);

When(
  new RegExp(`^(\\S+) refuse sur le site ${theProposal} avec le motif « (.+) »$`),
  async (
    { validationPage, identityApi, catalogApi, contributionApi },
    _who: string,
    name: string,
    _contributor: string,
    reason: string,
  ) => {
    const world = { validationPage, identityApi, catalogApi, contributionApi };
    await onTheCardOf(world, name, () => validationPage.reject(name, reason));
  },
);

When(
  new RegExp(`^(\\S+) refuse sur le site ${theProposal} sans motif$`),
  async (
    { validationPage, identityApi, catalogApi, contributionApi },
    _who: string,
    name: string,
    _contributor: string,
  ) => {
    const world = { validationPage, identityApi, catalogApi, contributionApi };
    await onTheCardOf(world, name, () => validationPage.reject(name, ''));
  },
);

Given(
  new RegExp(`^(\\S+) a tenté de refuser sur le site ${theProposal} avec le motif « (.+) »$`),
  async (
    { validationPage, identityApi, catalogApi, contributionApi },
    _who: string,
    name: string,
    _contributor: string,
    reason: string,
  ) => {
    const world = { validationPage, identityApi, catalogApi, contributionApi };
    await onTheCardOf(world, name, () => validationPage.reject(name, reason));
    await expect(validationPage.alertIn(name)).toBeVisible();
  },
);

// « … en corrigeant <champ> en "<valeur>"[, avec le message « … »] »: through the summary « proposé → retenu ».
When(
  new RegExp(
    `^(\\S+) accepte sur le site ${theProposal} en corrigeant (le nom|la difficulté base|la difficulté flyer) en "([^"]*)"(?:, avec le message « (.+) »)?$`,
  ),
  async (
    { validationPage, identityApi, catalogApi, contributionApi },
    _who: string,
    name: string,
    _contributor: string,
    field: string,
    value: string,
    message: string | null | undefined,
  ) => {
    const world = { validationPage, identityApi, catalogApi, contributionApi };
    const adjustment = fields[field]!(value);
    await onTheCardOf(world, name, async () => {
      await validationPage.adjust(name, adjustment);
      // An invalid name is reported by the form itself, before any summary (the next step checks it).
      if (adjustment.name !== undefined && !checkPoseName(adjustment.name).ok) return;
      // Without « avec le message », the optional group of the expression is null.
      await validationPage.publishAdjusted(name, message ?? undefined);
    });
  },
);

Given(
  /^(\S+) a accepté entre-temps la proposition de la pose "([^"]+)" par (\S+)$/,
  async ({ validationApi }, _who: string, name: string, _contributor: string) => {
    validationApi.acceptElsewhere(name);
  },
);

Given(/^le rôle validateur a été retiré à (\S+) entre-temps$/, async ({ identityApi }, name: string) => {
  identityApi.setRole(emailOf(identityApi, name), 'user');
});

// --- Observations after a decision -------------------------------------------------------------------

Then(
  'le site indique à {word} que la pose {string} est publiée dans le catalogue avec ses ajustements',
  async ({ validationPage }, _who: string, name: string) => {
    await expect(validationPage.report(name)).toHaveText(
      `La pose « ${name} » est publiée dans le catalogue avec tes ajustements.`,
    );
    await expect(validationPage.report(name)).toBeFocused();
  },
);

Then(
  'le site indique à {word} que la proposition de la pose {string} est refusée',
  async ({ validationPage }, _who: string, name: string) => {
    await expect(validationPage.report(name)).toHaveText(`La proposition « ${name} » est refusée.`);
    await expect(validationPage.report(name)).toBeFocused();
  },
);

Then(
  "le site ne propose plus à {word} d'accepter ni de refuser la proposition de la pose {string}",
  async ({ validationPage }, _who: string, name: string) => {
    await expect(validationPage.report(name)).toBeVisible();
    await expect(validationPage.card(name)).toHaveCount(0);
    await expect(validationPage.decisionButtons(name)).toHaveCount(0);
  },
);

Then('le site indique que le motif de refus est obligatoire', async ({ page, validationApi }) => {
  await expect(page.getByRole('main').getByText('Saisis le motif du refus.', { exact: true })).toBeVisible();
  expect(validationApi.decisions).toEqual([]); // checked before sending
});

// The quoted sentence may be followed by an advice (« Choisis un autre nom… »).
Then('le message du site contient « {} »', async ({ page }, text: string) => {
  await expect(page.getByRole('main').getByText(text).first()).toBeVisible();
});

// The scenario has a single proposal: the alert is in its card, which no longer offers to decide.
Then('le site indique à {word} que la proposition a déjà été traitée', async ({ page }, _who: string) => {
  const main = page.getByRole('main');
  await expect(main.getByRole('alert')).toContainText('déjà été traitée');
  await expect(main.getByRole('button', { name: /^(Accepter et publier|Refuser)$/ })).toHaveCount(0);
});

Then('le site propose à {word} de revenir au catalogue', async ({ page }, _who: string) => {
  const link = page.getByRole('main').getByRole('link', { name: 'Revenir au catalogue' });
  await expect(link).toBeVisible();
  await expect(link).toHaveAttribute('href', '/');
});

// --- Incidents ---------------------------------------------------------------------------------------

Given(/^la session de (\S+) a expiré$/, async ({ identityApi }, name: string) => {
  identityApi.expireSessionsOf(emailOf(identityApi, name));
});

Then(
  "le site indique que la décision n'a pas pu aboutir et que {word} peut réessayer",
  async ({ page }, _who: string) => {
    const alert = page.getByRole('main').getByRole('alert');
    await expect(alert).toContainText('impossible de joindre AcroFunJam');
    await expect(alert.getByRole('button', { name: 'Réessayer' })).toBeVisible();
  },
);

Then('le motif « {} » saisi par {word} est conservé', async ({ page }, reason: string, _who: string) => {
  await expect(page.getByRole('main').getByRole('textbox', { name: 'Motif du refus' })).toHaveValue(reason);
});

Then(
  "le site informe {word} que sa session a expiré et qu'il peut se connecter de nouveau",
  async ({ page }, _who: string) => {
    const alert = page.getByRole('main').getByRole('alert');
    await expect(alert).toContainText('Ta session a expiré.');
    await expect(alert.getByRole('link', { name: 'Se connecter' })).toBeVisible();
    // On this page, the alert in the card replaces the banner of the whole site.
    await expect(page.getByRole('region', { name: 'Session expirée' })).toHaveCount(0);
  },
);

Then(
  '{word} retrouve le motif « {} » pour la proposition de la pose {string}',
  async ({ validationPage }, _who: string, reason: string, name: string) => {
    await expect(validationPage.title).toBeVisible();
    await expect(validationPage.reasonField(name)).toHaveValue(reason);
  },
);
