import { expect } from '@playwright/test';
import type { DataTable } from 'playwright-bdd';
import { Given, Then, When } from '../fixtures';
import type { DisplayedPose } from '../pages/catalog-page';
import { difficultyCode } from '../support/catalog-api';

Given('les poses publiées suivantes dans le catalogue :', async ({ catalogApi }, poses: DataTable) => {
  for (const row of poses.hashes()) {
    catalogApi.publish({
      name: row['nom'] ?? '',
      baseDifficulty: difficultyCode(row['difficulté base'] ?? ''),
      flyerDifficulty: difficultyCode(row['difficulté flyer'] ?? ''),
    });
  }
});

When('un visiteur consulte les poses du catalogue', async ({ catalogPage }) => {
  await catalogPage.open();
});

Then('la liste présente exactement les poses suivantes :', async ({ catalogPage }, expected: DataTable) => {
  const byName = (a: DisplayedPose, b: DisplayedPose) => a.nom.localeCompare(b.nom);
  // The order is specified by its own rule: compare regardless of order here.
  const displayed = (await catalogPage.displayedPoses()).sort(byName);
  expect(displayed).toEqual((expected.hashes() as DisplayedPose[]).sort(byName));
});

Given('un catalogue sans aucune pose publiée', async ({ catalogApi }) => {
  // Nothing is published: the simulated API answers an empty list.
  expect(catalogApi.publishedCount).toBe(0);
});

Then('le visiteur est informé que le catalogue ne contient encore aucune pose', async ({ catalogPage }) => {
  await expect(catalogPage.emptyCatalogMessage).toBeVisible();
  await expect(catalogPage.poseTable).toBeHidden();
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

Then(
  'la pose {string} est présentée avec la difficulté base {string} et la difficulté flyer {string}',
  async ({ catalogPage }, name: string, baseDifficulty: string, flyerDifficulty: string) => {
    const displayed = (await catalogPage.displayedPoses()).filter((pose) => pose.nom === name);
    expect(displayed).toEqual([
      { nom: name, 'difficulté base': baseDifficulty, 'difficulté flyer': flyerDifficulty },
    ]);
  },
);
