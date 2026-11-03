import { expect, type Page } from '@playwright/test';
import { Given, Then, When } from '../fixtures';
import { IdentityForm, SiteHeader } from '../pages/identity-pages';
import { setAcroFunJamReachable } from '../support/reachability';

const defaultPassword = 'Throne-Bird-2026';

/** Messages displayed by the site (informal tone, docs/design), for the reasons stated by the scenarios. */
const messages: Record<string, string> = {
  "l'adresse e-mail sert déjà à un compte": 'Cette adresse e-mail sert déjà à un compte.',
  'le mot de passe doit contenir au moins 10 caractères':
    'Ton mot de passe est trop court : il doit contenir au moins 10 caractères.',
  "l'adresse e-mail est obligatoire": 'Saisis ton adresse e-mail.',
  "l'adresse e-mail n'est pas valide": 'Saisis une adresse e-mail au format nom@exemple.org.',
  'le mot de passe est obligatoire': 'Saisis ton mot de passe.',
  "l'adresse e-mail ou le mot de passe est incorrect":
    'Adresse e-mail ou mot de passe incorrect. Vérifie-les et réessaie.',
};

const message = (reason: string): string => {
  const text = messages[reason];
  if (!text) throw new Error(`Motif inconnu : ${reason}`);
  return text;
};

/** Signs in from the page being consulted (the home page if none), through the header link. */
const signInThroughTheSite = async (page: Page, email: string, password: string) => {
  if (!page.url().startsWith('http')) await page.goto('/');
  await new SiteHeader(page).openSignIn();
  const form = new IdentityForm(page, 'Se connecter');
  await form.fill(email, password);
  await form.submit();
};

const expectSignedIn = async (page: Page, email: string) => {
  await expect(new SiteHeader(page).account).toContainText(email);
  await expect(new SiteHeader(page).account.getByRole('button', { name: 'Se déconnecter' })).toBeVisible();
};

// --- Accounts ------------------------------------------------------------------------------

Given("{word} a un compte avec l'adresse {string}", async ({ identityApi }, name: string, email: string) => {
  identityApi.addAccount(email, defaultPassword);
  identityApi.people.set(name, { email, password: defaultPassword });
});

Given(
  "{word} a un compte avec l'adresse {string} et le mot de passe {string}",
  async ({ identityApi }, name: string, email: string, password: string) => {
    identityApi.addAccount(email, password);
    identityApi.people.set(name, { email, password });
  },
);

Given(
  "{int} tentatives de connexion avec l'adresse {string} ont échoué",
  async ({ identityApi }, attempts: number, email: string) => {
    identityApi.failSignIns(email, attempts);
  },
);

// --- Registration ----------------------------------------------------------------------------

const register = async (page: Page, email: string, password: string) => {
  await page.goto('/');
  await new SiteHeader(page).openRegistration();
  const form = new IdentityForm(page, "S'inscrire");
  await form.fill(email, password);
  await form.submit();
};

When(
  "{word} s'inscrit sur le site avec l'adresse {string} et le mot de passe {string}",
  async ({ page }, _name: string, email: string, password: string) => register(page, email, password),
);

When("une personne s'inscrit sur le site avec l'adresse {string}", async ({ page }, email: string) =>
  register(page, email, defaultPassword),
);

When(
  "une personne s'inscrit sur le site avec l'adresse {string} et le mot de passe {string}",
  async ({ page }, email: string, password: string) => register(page, email, password),
);

When("une personne commence à s'inscrire sur le site", async ({ page, header }) => {
  await page.goto('/');
  await header.openRegistration();
});

When(
  "une personne demande à {} sur le site avec l'adresse {string} et le mot de passe {string}",
  async ({ page }, request: string, email: string, password: string) => {
    if (request === "s'inscrire") return register(page, email, password);
    if (request === 'se connecter') return signInThroughTheSite(page, email, password);
    throw new Error(`Demande inconnue : ${request}`);
  },
);

// --- Sign in -----------------------------------------------------------------------------------

When(
  "{word} se connecte sur le site avec l'adresse {string} et le mot de passe {string}",
  async ({ page }, _name: string, email: string, password: string) =>
    signInThroughTheSite(page, email, password),
);

When(
  "une personne se connecte sur le site avec l'adresse {string} et le mot de passe {string}",
  async ({ page }, email: string, password: string) => signInThroughTheSite(page, email, password),
);

// A page of the catalog with a query string, so that coming back to it proves the return path is used.
const catalogPageOfOrigin = '/?depuis=accueil';

Given('{word} consulte les poses du catalogue en tant que visiteur', async ({ page }, _name: string) => {
  await page.goto(catalogPageOfOrigin);
});

Given(
  /^la connexion d'(\w+) n'a pas pu aboutir car AcroFunJam était injoignable$/,
  async ({ page, identityApi, catalogApi }, name: string) => {
    const person = identityApi.people.get(name)!;
    setAcroFunJamReachable({ identityApi, catalogApi }, false);
    await signInThroughTheSite(page, person.email, person.password);
    await expect(page.getByRole('alert')).toContainText('Impossible de joindre AcroFunJam');
  },
);

When('{word} réessaie de se connecter', async ({ signInForm }, _name: string) => signInForm.retry());

Given(
  /^(\w+) est connectée sur le site avec l'adresse "([^"]+)"$/,
  async ({ page, identityApi }, name: string, email: string) => {
    identityApi.addAccount(email, defaultPassword);
    identityApi.people.set(name, { email, password: defaultPassword });
    await signInThroughTheSite(page, email, defaultPassword);
    await expectSignedIn(page, email);
  },
);

// --- Sign out, reload, tabs ----------------------------------------------------------------

When('{word} se déconnecte', async ({ header }, _name: string) => header.signOut());

Given("{word} s'est déconnectée du site", async ({ page, header, identityApi }, name: string) => {
  const email = `${name.toLowerCase()}@example.org`;
  identityApi.addAccount(email, defaultPassword);
  identityApi.people.set(name, { email, password: defaultPassword });
  await signInThroughTheSite(page, email, defaultPassword);
  await expectSignedIn(page, email);
  await header.signOut();
  await expect(header.account.getByRole('link', { name: 'Se connecter' })).toBeVisible();
});

When('{word} recharge le site', async ({ page }, _name: string) => {
  await page.reload();
});

Given(
  "{word} a le site ouvert deux fois, connectée avec l'adresse {string}",
  async ({ page, otherTab, identityApi }, name: string, email: string) => {
    identityApi.addAccount(email, defaultPassword);
    identityApi.people.set(name, { email, password: defaultPassword });
    await signInThroughTheSite(page, email, defaultPassword);
    await expectSignedIn(page, email);
    await otherTab.goto('/');
    await expectSignedIn(otherTab, email);
  },
);

Given("{word} s'est déconnectée sur l'un des deux", async ({ otherTab }, _name: string) => {
  await otherTab.bringToFront();
  await new SiteHeader(otherTab).signOut();
});

When("{word} revient sur l'autre", async ({ page }, _name: string) => {
  await page.bringToFront();
});

// --- Session ---------------------------------------------------------------------------------

Given(/^la session d'(\w+) a expiré$/, async ({ identityApi }, name: string) => {
  identityApi.expireSessionsOf(identityApi.people.get(name)!.email);
});

When('{word} consulte les poses du catalogue', async ({ page }, _name: string) => {
  await page.goto('/');
});

// --- Observations ------------------------------------------------------------------------------

Then(
  /^l'en-tête indique qu'(\w+) est connectée avec l'adresse "([^"]+)"$/,
  async ({ page }, _name: string, email: string) => expectSignedIn(page, email),
);

Then("l'en-tête propose de se connecter et de s'inscrire", async ({ header }) => {
  await expect(header.account.getByRole('link', { name: 'Se connecter' })).toBeVisible();
  await expect(header.account.getByRole('link', { name: "S'inscrire" })).toBeVisible();
});

Then("le site indique que l'inscription est refusée car {}", async ({ page }, reason: string) => {
  await expect(page.getByText(message(reason), { exact: true })).toBeVisible();
});

Then('le site indique que la connexion est refusée car {}', async ({ page }, reason: string) => {
  await expect(page.getByRole('alert')).toHaveText(message(reason));
});

Then(
  /^le site indique que (l'adresse e-mail est obligatoire|l'adresse e-mail n'est pas valide|le mot de passe est obligatoire)$/,
  async ({ page, identityApi }, reason: string) => {
    await expect(page.getByText(message(reason), { exact: true })).toBeVisible();
    expect(identityApi.requests.filter((r) => r.startsWith('POST /identity/'))).toEqual([]); // checked before sending
  },
);

Then(
  "le site indique qu'il y a eu trop de tentatives de connexion et qu'il faut réessayer dans quelques minutes",
  async ({ page }) => {
    await expect(page.getByRole('alert')).toHaveText(
      'Trop de tentatives de connexion. Réessaie dans quelques minutes.',
    );
  },
);

Then(
  /^le site indique que la connexion n'a pas pu aboutir et qu'(\w+) peut réessayer$/,
  async ({ page }, _name: string) => {
    const alert = page.getByRole('alert');
    await expect(alert).toContainText(
      'Impossible de joindre AcroFunJam. Vérifie ta connexion Internet, puis réessaie.',
    );
    await expect(alert.getByRole('button', { name: 'Réessayer' })).toBeVisible();
  },
);

Then(
  "l'adresse {string} saisie par {word} est conservée",
  async ({ signInForm }, email: string, _name: string) => {
    await expect(signInForm.email).toHaveValue(email);
  },
);

Then('{word} retrouve les poses du catalogue', async ({ page }, _name: string) => {
  await expect(page.getByRole('heading', { level: 1, name: 'Catalogue des poses' })).toBeVisible();
  expect(new URL(page.url()).pathname + new URL(page.url()).search).toBe(catalogPageOfOrigin);
});

Then(
  /^le site informe (\w+) que sa session a expiré et qu'elle peut se connecter de nouveau$/,
  async ({ page }, _name: string) => {
    const banner = page.getByRole('region', { name: 'Session expirée' });
    await expect(banner).toContainText('Ta session a expiré.');
    await expect(banner.getByRole('link', { name: 'Se connecter' })).toBeVisible();
  },
);
