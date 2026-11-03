import { expect } from '@playwright/test';
import type { DataTable } from 'playwright-bdd';
import { Given, Then, When } from '../fixtures';
import type { DisplayedPose } from '../pages/catalog-page';
import { poseCountLabel } from '@acrofunjam/core';
import { difficultyCode } from '../support/catalog-api';
import { setAcroFunJamReachable } from '../support/reachability';

type PoseRow = { nom: string; 'difficulté base': string; 'difficulté flyer': string };

// The site writes the levels with a capital letter (« Débutant ») ; the scenarios use the domain terms in lower case.
const level = (displayed: string) => displayed.toLocaleLowerCase('fr-FR');

const asRow = (pose: DisplayedPose): PoseRow => ({
  nom: pose.nom,
  'difficulté base': level(pose.base),
  'difficulté flyer': level(pose.flyer),
});

const yesOrNo = (can: string) => (can === 'peut' ? 'Oui' : 'Non');

// --- Published poses ------------------------------------------------------------------------

Given('les poses publiées suivantes dans le catalogue :', async ({ catalogApi }, poses: DataTable) => {
  for (const row of poses.hashes()) {
    catalogApi.publish({
      name: row['nom'] ?? '',
      baseDifficulty: difficultyCode(row['difficulté base'] ?? ''),
      flyerDifficulty: difficultyCode(row['difficulté flyer'] ?? ''),
    });
  }
});

Given(/^les poses publiées (".+") dans le catalogue$/, async ({ catalogApi }, names: string) => {
  for (const [, name] of names.matchAll(/"([^"]+)"/g)) catalogApi.publish({ name: name ?? '' });
});

Given(
  'la pose publiée {string} de difficulté base {string} et de difficulté flyer {string}',
  async ({ catalogApi }, name: string, baseDifficulty: string, flyerDifficulty: string) => {
    catalogApi.publish({
      name,
      baseDifficulty: difficultyCode(baseDifficulty),
      flyerDifficulty: difficultyCode(flyerDifficulty),
    });
  },
);

Given(
  /^la pose publiée "([^"]+)" qui (peut|ne peut pas) commencer un flow et (peut|ne peut pas) terminer un flow$/,
  async ({ catalogApi }, name: string, start: string, end: string) => {
    catalogApi.publish({ name, canStartFlow: start === 'peut', canEndFlow: end === 'peut' });
  },
);

Given('un catalogue sans aucune pose publiée', async ({ catalogApi }) => {
  // Nothing is published: the simulated API answers an empty list.
  expect(catalogApi.publishedCount).toBe(0);
});

// --- Consulting the catalog -----------------------------------------------------------------

When('un visiteur consulte les poses du catalogue', async ({ catalogPage }) => {
  await catalogPage.open();
});

// --- Observations ---------------------------------------------------------------------------

Then('la liste présente exactement les poses suivantes :', async ({ catalogPage }, expected: DataTable) => {
  const byName = (a: PoseRow, b: PoseRow) => a.nom.localeCompare(b.nom);
  // The order is specified by its own rule: compare regardless of order here.
  const displayed = (await catalogPage.displayedPoses()).map(asRow).sort(byName);
  expect(displayed).toEqual((expected.hashes() as PoseRow[]).sort(byName));
});

Then(
  'la pose {string} est présentée avec la difficulté base {string} et la difficulté flyer {string}',
  async ({ catalogPage }, name: string, baseDifficulty: string, flyerDifficulty: string) => {
    const displayed = (await catalogPage.displayedPoses()).filter((pose) => pose.nom === name).map(asRow);
    expect(displayed).toEqual([
      { nom: name, 'difficulté base': baseDifficulty, 'difficulté flyer': flyerDifficulty },
    ]);
  },
);

Then(
  /^la pose "([^"]+)" est présentée comme une pose qui (peut|ne peut pas) commencer un flow et (peut|ne peut pas) terminer un flow$/,
  async ({ catalogPage }, name: string, start: string, end: string) => {
    const displayed = (await catalogPage.displayedPoses())
      .filter((pose) => pose.nom === name)
      .map(({ commencer, terminer }) => ({ commencer, terminer }));
    expect(displayed).toEqual([{ commencer: yesOrNo(start), terminer: yesOrNo(end) }]);
  },
);

Then('le visiteur est informé que le catalogue ne contient encore aucune pose', async ({ catalogPage }) => {
  await expect(catalogPage.emptyCatalogMessage).toBeVisible();
  await expect(catalogPage.poseList).toBeHidden();
});

Then(/^le catalogue annonce (\d+) poses?$/, async ({ catalogPage }, count: string) => {
  await expect(catalogPage.poseCount(poseCountLabel(Number(count)))).toBeVisible();
});

Then(/^le catalogue présente l'échelle de difficulté (.+)$/, async ({ catalogPage }, scale: string) => {
  await expect(catalogPage.difficultyScale).toBeVisible();
  expect((await catalogPage.scaleLevels()).map(level)).toEqual(scale.split(' < '));
});

Then(
  "le catalogue présente l'avertissement de responsabilité sous la légende de l'échelle de difficulté",
  async ({ catalogPage }) => {
    await expect(catalogPage.responsibilityWarning).toBeVisible();
    const legend = await catalogPage.difficultyScale.boundingBox();
    const warning = await catalogPage.responsibilityWarning.boundingBox();
    expect(warning!.y).toBeGreaterThanOrEqual(legend!.y + legend!.height);
  },
);

Then("le catalogue n'invite pas à proposer une pose", async ({ catalogPage, header }) => {
  // Wait until the poses are received, empty catalog or not: the link would only appear then.
  await expect(catalogPage.emptyCatalogMessage.or(catalogPage.poseList)).toBeVisible();
  // Wait until the session is known: the invitation would only appear once the person is signed in.
  await expect(header.account.getByRole('link', { name: 'Se connecter' })).toBeVisible();
  await expect(catalogPage.firstPoseInvitation).toHaveCount(0);
  await expect(catalogPage.proposePoseLinks).toHaveCount(0);
});

Then('le catalogue invite à proposer la première pose', async ({ catalogPage }) => {
  await expect(catalogPage.emptyCatalogMessage).toBeVisible();
  await expect(catalogPage.firstPoseInvitation).toBeVisible();
  // A single "Proposer une pose" on the page: the one of the empty block, not repeated next to the title.
  await expect(catalogPage.proposePoseLinks).toHaveCount(1);
  await expect(catalogPage.proposePoseLinks).toHaveAttribute('href', '/proposer-une-pose');
});

Then('le catalogue invite à proposer une pose', async ({ catalogPage }) => {
  await expect(catalogPage.poseList).toBeVisible();
  await expect(catalogPage.proposePoseLinks).toHaveCount(1);
  await expect(catalogPage.proposePoseLinks).toHaveAttribute('href', '/proposer-une-pose');
});

// --- Loading failure ------------------------------------------------------------------------

Given(
  'le chargement du catalogue a échoué car AcroFunJam était injoignable',
  async ({ identityApi, catalogApi, contributionApi, catalogPage }) => {
    setAcroFunJamReachable({ identityApi, catalogApi, contributionApi }, false);
    await catalogPage.open();
    await expect(catalogPage.loadingFailure).toContainText('Impossible de charger le catalogue.');
  },
);

When('le visiteur réessaie de charger le catalogue', async ({ catalogPage }) => {
  await catalogPage.retry();
});
