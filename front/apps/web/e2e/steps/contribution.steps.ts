import { expect } from '@playwright/test';
import { Given, Then, When } from '../fixtures';
import { IdentityForm } from '../pages/identity-pages';
import type { PoseToPropose, ProposalForm } from '../pages/proposal-form';
import { defaultPassword, expectSignedIn, signInThroughTheSite } from '../support/people';
import { beforeTheIncidents, type SimulatedApis } from '../support/reachability';

/** The scenarios write the levels as domain terms (« débutant »); the tiles show them as below. */
const tiles: Record<string, string> = {
  découverte: 'Découverte',
  débutant: 'Débutant',
  intermédiaire: 'Intermédiaire',
  avancé: 'Avancé',
};

const tile = (level: string) => lookup(tiles, level);

/** Messages displayed by the form, for the reasons stated by the scenarios (story3-ux, « Libellés »). */
const messages: Record<string, RegExp> = {
  'le nom de la pose est obligatoire': /^Saisis le nom de la pose\.$/,
  'la difficulté base est obligatoire': /^Choisis la difficulté base\.$/,
  'la difficulté flyer est obligatoire': /^Choisis la difficulté flyer\.$/,
  'il faut préciser si la pose peut commencer un flow':
    /^Indique si un flow peut commencer sur cette pose\.$/,
  'il faut préciser si la pose peut terminer un flow': /^Indique si un flow peut terminer sur cette pose\.$/,
  'le nom de la pose ne doit pas dépasser 60 caractères':
    /^Le nom ne doit pas dépasser 60 caractères \(il en compte \d+\)\.$/,
};

/** What « une pose sans … » leaves unanswered; the rest of the pose is valid. */
const withoutAnswer: Record<string, PoseToPropose> = {
  'sans nom': { name: '' },
  'sans difficulté base': { base: null },
  'sans difficulté flyer': { flyer: null },
  'sans préciser si elle peut commencer un flow': { canStartFlow: null },
  'sans préciser si elle peut terminer un flow': { canEndFlow: null },
};

function lookup<T>(table: Record<string, T>, key: string): T {
  const value = table[key];
  if (value === undefined) throw new Error(`Cas inconnu : ${key}`);
  return value;
}

type World = SimulatedApis & { proposalForm: ProposalForm };

/** Fills in and sends the form; opens it first if needed, as it was before the incidents of the scenario. */
const propose = async ({ proposalForm, ...apis }: World, pose: PoseToPropose) => {
  if (proposalForm.isOpen()) await expect(proposalForm.form).toBeVisible();
  else await beforeTheIncidents(apis, () => proposalForm.open());
  await proposalForm.fill(pose);
  await proposalForm.submit();
};

const pose = (name: string, base: string, flyer: string): PoseToPropose => ({
  name,
  base: tile(base),
  flyer: tile(flyer),
});

// --- People -----------------------------------------------------------------------------------

Given(
  /^(\w+) est (validateur|administrateur), connecté sur le site$/,
  async ({ page, identityApi }, name: string, role: string) => {
    const email = `${name.toLowerCase()}@example.org`;
    identityApi.addAccount(email, defaultPassword, role === 'validateur' ? 'validator' : 'administrator');
    identityApi.people.set(name, { email, password: defaultPassword });
    await signInThroughTheSite(page, email, defaultPassword);
    await expectSignedIn(page, email);
  },
);

// --- Access to the form -----------------------------------------------------------------------

When('un visiteur accède directement à la page « Proposer une pose »', async ({ page }) => {
  await page.goto('/proposer-une-pose');
});

Given(
  '{word} a accédé directement à la page « Proposer une pose » en tant que visiteur',
  async ({ page, signInForm }, _name: string) => {
    await page.goto('/proposer-une-pose');
    await expect(signInForm.email).toBeVisible();
  },
);

Then(
  'le site invite le visiteur à se connecter, sans lui présenter le formulaire de proposition',
  async ({ page, signInForm, proposalForm }) => {
    await expect(signInForm.email).toBeVisible();
    await expect(page.getByText('Connecte-toi pour proposer une pose.', { exact: true })).toBeVisible();
    expect(new URL(page.url()).searchParams.get('retour')).toBe('/proposer-une-pose');
    await expect(proposalForm.form).toHaveCount(0);
  },
);

Then('{word} peut proposer une pose', async ({ page, proposalForm }, _name: string) => {
  await expect(proposalForm.name).toBeVisible();
  expect(new URL(page.url()).pathname).toBe('/proposer-une-pose');
});

When('{word} commence à proposer une pose sur le site', async ({ proposalForm }, _name: string) => {
  await proposalForm.open();
});

Then(
  'le site annonce à {word} que la pose sera publiée directement dans le catalogue',
  async ({ page }, _name: string) => {
    await expect(
      page.getByText(
        "Ton rôle te permet de publier directement : la pose apparaîtra dans le catalogue dès l'envoi.",
        { exact: true },
      ),
    ).toBeVisible();
  },
);

// --- Proposing --------------------------------------------------------------------------------

const aPose = /"([^"]+)" de difficulté base "([^"]+)" et de difficulté flyer "([^"]+)"/.source;

// playwright-bdd reads the fixtures a step needs from the destructuring of its first argument.
When(
  new RegExp(`^(\\w+) propose sur le site la pose ${aPose}$`),
  async (
    { proposalForm, identityApi, catalogApi, contributionApi },
    _who: string,
    name: string,
    base: string,
    flyer: string,
  ) => {
    await propose({ proposalForm, identityApi, catalogApi, contributionApi }, pose(name, base, flyer));
  },
);

Given(
  new RegExp(`^(\\w+) a proposé sur le site la pose ${aPose}$`),
  async (
    { proposalForm, identityApi, catalogApi, contributionApi },
    _who: string,
    name: string,
    base: string,
    flyer: string,
  ) => {
    await propose({ proposalForm, identityApi, catalogApi, contributionApi }, pose(name, base, flyer));
    await expect(proposalForm.successTitle).toBeVisible();
  },
);

Given(
  new RegExp(`^(\\w+) a tenté de proposer sur le site la pose ${aPose}$`),
  async (
    { proposalForm, identityApi, catalogApi, contributionApi },
    _who: string,
    name: string,
    base: string,
    flyer: string,
  ) => {
    await propose({ proposalForm, identityApi, catalogApi, contributionApi }, pose(name, base, flyer));
    await expect(proposalForm.alert).toBeVisible();
  },
);

When(
  /^(\w+) propose sur le site une pose nommée "([^"]*)"$/,
  async ({ proposalForm, identityApi, catalogApi, contributionApi }, _who: string, name: string) => {
    await propose({ proposalForm, identityApi, catalogApi, contributionApi }, { name });
  },
);

When(
  /^(\w+) propose sur le site une pose dont le nom compte (\d+) caractères$/,
  async ({ proposalForm, identityApi, catalogApi, contributionApi }, _who: string, length: string) => {
    await propose(
      { proposalForm, identityApi, catalogApi, contributionApi },
      { name: 'x'.repeat(Number(length)) },
    );
  },
);

When(
  /^(\w+) propose sur le site une pose (sans .+)$/,
  async ({ proposalForm, identityApi, catalogApi, contributionApi }, _who: string, missing: string) => {
    await propose({ proposalForm, identityApi, catalogApi, contributionApi }, lookup(withoutAnswer, missing));
  },
);

When('{word} choisit de proposer une autre pose', async ({ proposalForm }, _name: string) => {
  await proposalForm.proposeAnother();
});

When('{word} choisit de voir le catalogue', async ({ proposalForm }, _name: string) => {
  await proposalForm.seeCatalog();
});

When(
  '{word} se connecte de nouveau sur le site',
  async ({ page, proposalForm, identityApi }, name: string) => {
    const person = identityApi.people.get(name)!;
    await proposalForm.alert.getByRole('link', { name: 'Se connecter' }).click();
    const form = new IdentityForm(page, 'Se connecter');
    await form.fill(person.email, person.password);
    await form.submit();
  },
);

// --- Observations -----------------------------------------------------------------------------

Then(
  /^le site indique à (\w+) que sa proposition de la pose "([^"]+)" est en attente de validation$/,
  async ({ proposalForm, page }, _who: string, name: string) => {
    await expect(proposalForm.successTitle).toHaveText('Merci, ta proposition est envoyée.');
    await expect(proposalForm.successTitle).toBeFocused();
    await expect(
      page.getByText(
        `La pose « ${name} » est en attente de validation. Elle apparaîtra dans le catalogue quand un validateur l'aura acceptée.`,
        { exact: true },
      ),
    ).toBeVisible();
  },
);

Then(
  /^le site indique à (\w+) que la pose "([^"]+)" est publiée dans le catalogue$/,
  async ({ proposalForm, page }, _who: string, name: string) => {
    await expect(proposalForm.successTitle).toHaveText(`La pose « ${name} » est publiée.`);
    await expect(
      page.getByText('Elle apparaît maintenant dans le catalogue.', { exact: true }),
    ).toBeVisible();
  },
);

Then('le formulaire de proposition est vide', async ({ proposalForm }) => {
  await expect(proposalForm.name).toHaveValue('');
  await expect(proposalForm.name).toBeFocused();
  // 4 levels × 2 difficulties + Yes / No × 2 questions: every choice is there, none is made.
  await expect(proposalForm.radios).toHaveCount(12);
  for (const radio of await proposalForm.radios.all()) await expect(radio).not.toBeChecked();
});

Then(
  /^le site indique que (le nom de la pose est obligatoire|la difficulté base est obligatoire|la difficulté flyer est obligatoire|il faut préciser si la pose peut commencer un flow|il faut préciser si la pose peut terminer un flow|le nom de la pose ne doit pas dépasser 60 caractères)$/,
  async ({ proposalForm, contributionApi }, reason: string) => {
    await expect(proposalForm.form.getByText(lookup(messages, reason))).toBeVisible();
    expect(contributionApi.received).toEqual([]); // checked before sending
  },
);

Then(
  /^le site indique que la proposition n'a pas pu aboutir et qu'(\w+) peut réessayer$/,
  async ({ proposalForm }, _who: string) => {
    await expect(proposalForm.alert).toContainText(
      "Ta proposition n'a pas pu être envoyée : impossible de joindre AcroFunJam.",
    );
    await expect(proposalForm.alert.getByRole('button', { name: 'Réessayer' })).toBeVisible();
  },
);

Then(
  /^la pose "([^"]+)" saisie par (\w+) est conservée$/,
  async ({ proposalForm }, name: string, _who: string) => {
    await expect(proposalForm.name).toHaveValue(name);
    // The rest of the pose, as filled in by the scenario, is kept too.
    const { base, flyer } = proposalForm.lastFilled;
    if (base)
      await expect(proposalForm.baseDifficulty.getByRole('radio', { name: base, exact: true })).toBeChecked();
    if (flyer)
      await expect(
        proposalForm.flyerDifficulty.getByRole('radio', { name: flyer, exact: true }),
      ).toBeChecked();
  },
);

Then(
  /^le formulaire de proposition informe (\w+) que sa session a expiré et qu'elle peut se connecter de nouveau$/,
  async ({ page, proposalForm }, _who: string) => {
    await expect(proposalForm.alert).toContainText('Ta session a expiré.');
    await expect(proposalForm.alert.getByRole('link', { name: 'Se connecter' })).toBeVisible();
    // On this page, the alert replaces the banner of the whole site.
    await expect(page.getByRole('region', { name: 'Session expirée' })).toHaveCount(0);
  },
);

Then(
  new RegExp(`^(\\w+) retrouve dans le formulaire de proposition la pose ${aPose}$`),
  async ({ proposalForm }, _who: string, name: string, base: string, flyer: string) => {
    await expect(proposalForm.name).toHaveValue(name);
    await expect(
      proposalForm.baseDifficulty.getByRole('radio', { name: tile(base), exact: true }),
    ).toBeChecked();
    await expect(
      proposalForm.flyerDifficulty.getByRole('radio', { name: tile(flyer), exact: true }),
    ).toBeChecked();
  },
);
