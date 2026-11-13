import { expect } from '@playwright/test';
import { Given, Then, When } from '../fixtures';
import type { CatalogPage } from '../pages/catalog-page';
import { revisionPath, type RevisionForm, type RevisionToPropose } from '../pages/revision-form';
import { beforeTheIncidents, type SimulatedApis } from '../support/reachability';

// Story 6 « Proposer une modification d'une pose publiée »: the form of the site (access, sending, refusals,
// incidents), scenarios @web of proposer-une-modification.feature.

/** The scenarios write the levels as domain terms (« découverte »); the tiles show them capitalised. */
const tile = (level: string) => level.charAt(0).toLocaleUpperCase('fr-FR') + level.slice(1);

const escaped = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const aChange = /en changeant (le nom|la difficulté base|la difficulté flyer) en "([^"]+)"/.source;

/** What « en changeant la difficulté flyer en "découverte" » changes in the form (values as displayed). */
const formChangeOf = (field: string, value: string): RevisionToPropose => {
  switch (field) {
    case 'le nom':
      return { name: value };
    case 'la difficulté base':
      return { base: tile(value) };
    default:
      return { flyer: tile(value) };
  }
};

/** From the catalog, as a person does: the link « Proposer une modification » of the card of the pose. */
export const startRevision = async (catalogPage: CatalogPage, revisionForm: RevisionForm, pose: string) => {
  if (!catalogPage.isOpen()) await catalogPage.open();
  await catalogPage.revisionLink(pose).click();
  await revisionForm.loaded();
};

type RevisionWorld = SimulatedApis & { catalogPage: CatalogPage; revisionForm: RevisionForm };

/** Opens the form of the pose if needed, as it was before the incidents of the scenario, then fills it in. */
const fillRevision = async (
  { catalogPage, revisionForm, ...apis }: RevisionWorld,
  pose: string,
  change: RevisionToPropose,
) => {
  if (revisionForm.isOpen()) await expect(revisionForm.form).toBeVisible();
  else await beforeTheIncidents(apis, () => startRevision(catalogPage, revisionForm, pose));
  await revisionForm.change(change);
};

/**
 * « Proposer la modification » for a user; « Vérifier la modification », then « Publier la modification » from the
 * summary, for a validator or an administrator, who publishes directly.
 */
const proposeRevision = async (world: RevisionWorld, who: string, pose: string, change: RevisionToPropose) => {
  await fillRevision(world, pose, change);
  const { revisionForm, identityApi } = world;
  await revisionForm.submit();
  const email = identityApi.people.get(who)?.email ?? `${who.toLowerCase()}@example.org`;
  if ((identityApi.roleOf(email) ?? 'user') === 'user') return;
  await expect(revisionForm.summaryTitle).toBeVisible();
  await revisionForm.publish();
};

// --- Direct access ------------------------------------------------------------------------------------

When(
  /^un visiteur accède directement à la page « Proposer une modification » de la pose "([^"]+)"$/,
  async ({ page, catalogApi }, pose: string) => {
    await page.goto(revisionPath(catalogApi.poseNamed(pose).id));
  },
);

Given(
  /^(\S+) a accédé directement à la page « Proposer une modification » de la pose "([^"]+)" en tant que visiteur$/,
  async ({ page, catalogApi, signInForm }, _who: string, pose: string) => {
    await page.goto(revisionPath(catalogApi.poseNamed(pose).id));
    await expect(signInForm.email).toBeVisible();
  },
);

When(
  /^(\S+) accède directement à la page « Proposer une modification » d'une pose qui n'existe pas dans le catalogue$/,
  async ({ page }, _who: string) => {
    await page.goto(revisionPath(crypto.randomUUID()));
  },
);

Then(
  'le site invite le visiteur à se connecter, sans lui présenter le formulaire de modification',
  async ({ page, signInForm, revisionForm, catalogApi }) => {
    await expect(signInForm.email).toBeVisible();
    await expect(
      page.getByText('Connecte-toi pour proposer une modification.', { exact: true }),
    ).toBeVisible();
    expect(new URL(page.url()).searchParams.get('retour')).toBe(
      revisionPath(catalogApi.poseNamed('Throne').id),
    );
    await expect(revisionForm.form).toHaveCount(0);
  },
);

Then(
  /^(\S+) peut proposer une modification de la pose "([^"]+)"$/,
  async ({ page, revisionForm, catalogApi }, _who: string, pose: string) => {
    await expect(revisionForm.name).toHaveValue(pose);
    expect(new URL(page.url()).pathname).toBe(revisionPath(catalogApi.poseNamed(pose).id));
  },
);

Then('le site propose à {word} de voir ses propositions', async ({ page }, _who: string) => {
  const link = page.getByRole('main').getByRole('link', { name: 'Voir mes propositions' });
  await expect(link).toBeVisible();
  await expect(link).toHaveAttribute('href', '/mes-propositions');
});

// --- Proposing a revision -----------------------------------------------------------------------------

When(
  new RegExp(`^(\\S+) propose sur le site de modifier la pose "([^"]+)" ${aChange}$`),
  async (
    { catalogPage, revisionForm, identityApi, catalogApi, contributionApi },
    who: string,
    pose: string,
    field: string,
    value: string,
  ) => {
    const world = { catalogPage, revisionForm, identityApi, catalogApi, contributionApi };
    await proposeRevision(world, who, pose, formChangeOf(field, value));
  },
);

Given(
  new RegExp(`^(\\S+) a tenté de proposer sur le site de modifier la pose "([^"]+)" ${aChange}$`),
  async (
    { catalogPage, revisionForm, identityApi, catalogApi, contributionApi },
    who: string,
    pose: string,
    field: string,
    value: string,
  ) => {
    const world = { catalogPage, revisionForm, identityApi, catalogApi, contributionApi };
    await proposeRevision(world, who, pose, formChangeOf(field, value));
    await expect(revisionForm.alert).toBeVisible();
  },
);

When(
  /^(\S+) propose sur le site de modifier la pose "([^"]+)" sans rien changer$/,
  async (
    { catalogPage, revisionForm, identityApi, catalogApi, contributionApi },
    _who: string,
    pose: string,
  ) => {
    const world = { catalogPage, revisionForm, identityApi, catalogApi, contributionApi };
    await fillRevision(world, pose, {});
    await revisionForm.submit();
  },
);

When(
  new RegExp(`^(\\S+) prépare sur le site la modification de la pose "([^"]+)" ${aChange}$`),
  async (
    { catalogPage, revisionForm, identityApi, catalogApi, contributionApi },
    _who: string,
    pose: string,
    field: string,
    value: string,
  ) => {
    const world = { catalogPage, revisionForm, identityApi, catalogApi, contributionApi };
    await fillRevision(world, pose, formChangeOf(field, value));
    await revisionForm.submit();
  },
);

Given(
  /^(\S+) a commencé à proposer sur le site une modification de la pose "([^"]+)"$/,
  async ({ catalogPage, revisionForm }, _who: string, pose: string) => {
    await startRevision(catalogPage, revisionForm, pose);
  },
);

When(
  new RegExp(`^(\\S+) propose sur le site sa modification ${aChange}$`),
  async ({ revisionForm }, _who: string, field: string, value: string) => {
    await expect(revisionForm.form).toBeVisible();
    await revisionForm.change(formChangeOf(field, value));
    await revisionForm.submit();
  },
);

// --- Observations -------------------------------------------------------------------------------------

Then(
  /^le site présente à (\S+), avant de publier, la difficulté (base|flyer) actuellement « ([^»]+) » → nouvelle « ([^»]+) »$/,
  async (
    { page, revisionForm, poseRevisionApi },
    _who: string,
    role: string,
    current: string,
    next: string,
  ) => {
    await expect(revisionForm.summaryTitle).toBeFocused();
    const value = page
      .getByRole('main')
      .getByRole('term')
      .filter({ hasText: new RegExp(`^Difficulté ${role}$`) })
      .locator('xpath=following-sibling::dd[1]');
    await expect(value).toHaveText(`Actuellement : ${tile(current)}, nouveau : ${tile(next)}`);
    expect(poseRevisionApi.received).toEqual([]); // nothing published yet
  },
);

Then('le site indique pour le nom « {} »', async ({ revisionForm }, message: string) => {
  await expect(revisionForm.name).toHaveAccessibleDescription(new RegExp(`${escaped(message)}$`));
});

Then(
  /^le formulaire de modification présente la difficulté base actuelle "([^"]+)" et la difficulté flyer saisie "([^"]+)"$/,
  async ({ revisionForm }, base: string, flyer: string) => {
    await expect(revisionForm.baseDifficulty).toHaveAccessibleDescription(`Actuellement : ${tile(base)}`);
    await expect(revisionForm.checked(revisionForm.baseDifficulty)).toHaveAccessibleName(tile(base));
    await expect(revisionForm.checked(revisionForm.flyerDifficulty)).toHaveAccessibleName(tile(flyer));
  },
);

Then(
  /^la modification de la pose "([^"]+)" saisie par (\S+) est conservée$/,
  async ({ revisionForm }, pose: string, _who: string) => {
    await expect(revisionForm.name).toHaveValue(pose);
    await expect(revisionForm.checked(revisionForm.flyerDifficulty)).toHaveAccessibleName(
      revisionForm.lastChange.flyer ?? '',
    );
  },
);

Then(
  /^le formulaire de modification informe (\S+) que sa session a expiré et qu'elle peut se connecter de nouveau$/,
  async ({ page, revisionForm }, _who: string) => {
    await expect(revisionForm.alert).toContainText('Ta session a expiré.');
    await expect(revisionForm.alert.getByRole('link', { name: 'Se connecter' })).toBeVisible();
    // On this page, the alert replaces the banner of the whole site.
    await expect(page.getByRole('region', { name: 'Session expirée' })).toHaveCount(0);
  },
);

Then(
  /^(\S+) retrouve dans le formulaire de modification de la pose "([^"]+)" la difficulté flyer "([^"]+)"$/,
  async ({ page, revisionForm, catalogApi }, _who: string, pose: string, flyer: string) => {
    await expect(revisionForm.form).toBeVisible();
    expect(new URL(page.url()).pathname).toBe(revisionPath(catalogApi.poseNamed(pose).id));
    await expect(revisionForm.checked(revisionForm.flyerDifficulty)).toHaveAccessibleName(tile(flyer));
  },
);
