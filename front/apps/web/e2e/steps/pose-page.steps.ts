import { expect } from '@playwright/test';
import type { DataTable } from 'playwright-bdd';
import { Given, Then, When } from '../fixtures';
import { posePath, type Direction, type DisplayedTransition } from '../pages/pose-page';
import { difficultyCode, type CatalogApi } from '../support/catalog-api';
import { setAcroFunJamReachable } from '../support/reachability';

// Story 7 « Proposer une transition », volet Catalogue: the page of a pose, scenarios @web of
// consulter-les-transitions.feature.

/** The site writes the levels with a capital letter (« Débutant »); the scenarios use the domain terms in lower case. */
const level = (displayed: string) => displayed.toLocaleLowerCase('fr-FR');
const capitalised = (term: string) => term.charAt(0).toLocaleUpperCase('fr-FR') + term.slice(1);

const directionOf = (word: string): Direction => (word === 'depuis' ? 'from' : 'to');

/** A row of the scenarios: the other pose, the name (empty without one), the difficulties and the description. */
const asRow = (transition: DisplayedTransition, otherPoseColumn: string) => ({
  [otherPoseColumn]: transition.otherPose,
  nom: transition.named ? transition.title : '',
  'difficulté base': level(transition.base),
  'difficulté flyer': level(transition.flyer),
  description: transition.description,
});

type TransitionToPublish = {
  from: string;
  to: string;
  name: string | null;
  base: string;
  flyer: string;
  description: string | null;
};

/** Publishes a transition between two published poses of the simulated catalog. */
export const publishTransition = (
  catalogApi: CatalogApi,
  { from, to, name, base, flyer, description }: TransitionToPublish,
) =>
  catalogApi.publishTransition({
    fromPoseId: catalogApi.poseNamed(from).id,
    toPoseId: catalogApi.poseNamed(to).id,
    name: name || null,
    baseDifficulty: difficultyCode(base),
    flyerDifficulty: difficultyCode(flyer),
    description: description || null,
  });

// --- Published transitions --------------------------------------------------------------------------

Given('les transitions publiées suivantes dans le catalogue :', async ({ catalogApi }, rows: DataTable) => {
  for (const row of rows.hashes())
    publishTransition(catalogApi, {
      from: row['pose de départ'] ?? '',
      to: row["pose d'arrivée"] ?? '',
      name: row['nom'] ?? null,
      base: row['difficulté base'] ?? '',
      flyer: row['difficulté flyer'] ?? '',
      description: row['description'] ?? null,
    });
});

// « la transition publiée sans nom de "Throne" vers "Bird" [de difficulté base … et de difficulté flyer …][, avec la
// description « … »] », « la transition publiée "Ninja Star" de "Star" vers "Star" … ».
Given(
  /^la transition publiée (?:sans nom|"([^"]+)") de "([^"]+)" vers "([^"]+)"(?: de difficulté base "([^"]+)" et de difficulté flyer "([^"]+)")?(?:, avec la description « (.+) »)?$/,
  async (
    { catalogApi },
    name: string | null | undefined,
    from: string,
    to: string,
    base: string | null | undefined,
    flyer: string | null | undefined,
    description: string | null | undefined,
  ) => {
    publishTransition(catalogApi, {
      from,
      to,
      name: name ?? null,
      base: base ?? 'débutant',
      flyer: flyer ?? 'débutant',
      description: description ?? null,
    });
  },
);

Given(
  /^la pose publiée "([^"]+)" de difficulté base "([^"]+)" et de difficulté flyer "([^"]+)", qui (peut|ne peut pas) commencer un flow et (peut|ne peut pas) terminer un flow$/,
  async ({ catalogApi }, name: string, base: string, flyer: string, start: string, end: string) => {
    catalogApi.publish({
      name,
      baseDifficulty: difficultyCode(base),
      flyerDifficulty: difficultyCode(flyer),
      canStartFlow: start === 'peut',
      canEndFlow: end === 'peut',
    });
  },
);

// --- Consulting the page of a pose ------------------------------------------------------------------

Given(
  /^(?:un visiteur|\S+) consulte la pose "([^"]+)" du catalogue$/,
  async ({ posePage, catalogApi }, pose: string) => {
    await posePage.open(catalogApi.poseNamed(pose).id);
  },
);

When("un visiteur consulte une pose qui n'existe pas dans le catalogue", async ({ posePage }) => {
  await posePage.open(crypto.randomUUID());
});

Given(
  'le chargement de la pose {string} a échoué car AcroFunJam était injoignable',
  async ({ posePage, identityApi, catalogApi, contributionApi }, pose: string) => {
    const id = catalogApi.poseNamed(pose).id;
    setAcroFunJamReachable({ identityApi, catalogApi, contributionApi }, false);
    await posePage.open(id);
    await expect(posePage.loadingFailure).toContainText('Impossible de charger la pose.');
  },
);

When('le visiteur réessaie de charger la pose', async ({ posePage }) => {
  await posePage.retry();
});

When('le visiteur ouvre la pose {string} depuis le catalogue', async ({ catalogPage }, pose: string) => {
  await catalogPage.poseLink(pose).click();
});

When(
  /^le visiteur ouvre la pose (?:d'arrivée|de départ) "([^"]+)" depuis la transition « (.+) → (.+) »$/,
  async ({ posePage }, other: string, from: string, to: string) => {
    // On the page of the departure pose, the transition is among those from it; on the arrival pose, those to it.
    const [direction, pose]: [Direction, string] = other === to ? ['from', from] : ['to', to];
    await posePage
      .transition(direction, pose, `de ${from} vers ${to}`)
      .getByRole('link', { name: other, exact: true })
      .click();
  },
);

When('le visiteur revient au catalogue', async ({ posePage }) => {
  await posePage.backLink.click();
});

// --- Observations -----------------------------------------------------------------------------------

Then(
  /^les transitions (depuis|vers) la pose "([^"]+)" sont exactement :$/,
  async ({ posePage }, direction: string, pose: string, expected: DataTable) => {
    const otherPoseColumn = direction === 'depuis' ? "pose d'arrivée" : 'pose de départ';
    const displayed = await posePage.transitions(directionOf(direction), pose);
    expect(displayed.map((transition) => asRow(transition, otherPoseColumn))).toEqual(expected.hashes());
  },
);

Then(
  /^les transitions depuis la pose "([^"]+)" présentent "([^"]+)" vers la même pose$/,
  async ({ posePage }, pose: string, name: string) => {
    const transition = posePage.transition('from', pose, name);
    await expect(transition).toBeVisible();
    await expect(transition.getByRole('link', { name: pose, exact: true })).toBeVisible();
    await expect(transition.getByText('(même pose)', { exact: true })).toBeVisible();
  },
);

Then(
  /^les transitions (depuis|vers) la pose "([^"]+)" présentent la transition « (.+) → (.+) »$/,
  async ({ posePage }, direction: string, pose: string, from: string, to: string) => {
    // Read « de Throne vers Bird » by assistive technologies, the arrow hidden from them.
    const transition = posePage.transition(directionOf(direction), pose, `de ${from} vers ${to}`);
    await expect(transition).toBeVisible();
    const [displayed] = (await posePage.transitions(directionOf(direction), pose)).filter(
      (read) => read.title === `de ${from} vers ${to}`,
    );
    expect(displayed?.visibleTitle).toBe(`${from} → ${to}`);
  },
);

Then(
  /^la page présente la pose "([^"]+)" avec la difficulté base "([^"]+)" et la difficulté flyer "([^"]+)", qui (peut|ne peut pas) commencer un flow et (peut|ne peut pas) terminer un flow$/,
  async ({ posePage }, pose: string, base: string, flyer: string, start: string, end: string) => {
    await expect(posePage.title(pose)).toBeVisible();
    await expect(posePage.value('Base')).toHaveText(capitalised(base));
    await expect(posePage.value('Flyer')).toHaveText(capitalised(flyer));
    await expect(posePage.value('Peut commencer un flow')).toHaveText(start === 'peut' ? 'Oui' : 'Non');
    await expect(posePage.value('Peut terminer un flow')).toHaveText(end === 'peut' ? 'Oui' : 'Non');
  },
);

Then(
  "la page présente l'avertissement de responsabilité sur les transitions sous la légende de l'échelle de difficulté",
  async ({ posePage }) => {
    await expect(posePage.responsibilityWarning).toBeVisible();
    const legend = await posePage.difficultyScale.boundingBox();
    const warning = await posePage.responsibilityWarning.boundingBox();
    expect(warning!.y).toBeGreaterThanOrEqual(legend!.y + legend!.height);
  },
);

Then('le site présente la page « Pose introuvable »', async ({ page }) => {
  await expect(page.getByRole('heading', { level: 1, name: 'Pose introuvable' })).toBeVisible();
  await expect(page.getByRole('main').getByRole('link', { name: 'Voir le catalogue' })).toHaveAttribute(
    'href',
    '/',
  );
});

Then(
  "le site indique que la pose n'a pas pu être chargée et que le visiteur peut réessayer",
  async ({ page, posePage }) => {
    await expect(posePage.loadingFailure).toContainText(
      'Impossible de charger la pose. Vérifie ta connexion Internet, puis réessaie.',
    );
    await expect(page.getByRole('main').getByRole('button', { name: 'Réessayer' })).toBeVisible();
    // An outage never looks like an unknown pose.
    await expect(page.getByRole('heading', { level: 1, name: 'Pose introuvable' })).toHaveCount(0);
  },
);

Then(
  'le site présente la pose {string} du catalogue',
  async ({ page, posePage, catalogApi }, pose: string) => {
    await expect(posePage.title(pose)).toBeVisible();
    expect(new URL(page.url()).pathname).toBe(posePath(catalogApi.poseNamed(pose).id));
  },
);

Then('le site présente les poses du catalogue', async ({ page, catalogPage }) => {
  await expect(page.getByRole('heading', { level: 1, name: 'Catalogue des poses' })).toBeVisible();
  await expect(catalogPage.poseList).toBeVisible();
  expect(new URL(page.url()).pathname).toBe('/');
});
