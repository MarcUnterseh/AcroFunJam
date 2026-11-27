import { expect, type Locator, type Page } from '@playwright/test';
import { Given, Then, When } from '../fixtures';
import { tagsPath } from '../pages/tags-page';
import type { CatalogApi } from '../support/catalog-api';
import type { TagApi, TagScope } from '../support/tag-api';
import { publishTransition } from './pose-page.steps';

// Story 9a « Étiqueter les poses », volet Catalogue: scenarios @web of etiquettes-applicables-aux-poses.feature,
// consulter-les-etiquettes-des-poses.feature and etiqueter-une-pose-publiee.feature.

/** « "lunaire" et "inversion" »: the names between straight quotes. */
const quoted = (names: string) => [...names.matchAll(/"([^"]+)"/g)].map((match) => match[1]!);

const scopes: Record<string, TagScope> = {
  'aux poses seulement': 'poses',
  'aux transitions seulement': 'transitions',
  'aux poses et aux transitions': 'poses-and-transitions',
  'transitions seulement': 'transitions',
  'Aux poses': 'poses',
  'Aux transitions': 'transitions',
  'Aux poses et aux transitions': 'poses-and-transitions',
};

const scopeOf = (label: string): TagScope => {
  const scope = scopes[label];
  if (!scope) throw new Error(`Champ d'application inconnu : ${label}`);
  return scope;
};

/** The tags named by a scenario, by id, as the API chooses them for a pose. */
const poseTagIds = (tagApi: TagApi, names: string) =>
  tagApi.choose(
    quoted(names).map((name) => tagApi.tagNamed(name).id),
    'pose',
  ).tagIds;

/** The pills of the line « Étiquettes » under a container (the sky of a pose, a card). */
const pillsOf = (container: Locator) =>
  container.getByRole('list', { name: 'Étiquettes', exact: true }).getByRole('listitem');

const hero = (page: Page) => page.locator('.pose-hero');

const cardOf = (page: Page, name: string) =>
  page.locator('.pose-card').filter({ has: page.getByRole('heading', { level: 2, name, exact: true }) });

const openPose = async (page: Page, catalogApi: CatalogApi, name: string) => {
  await page.goto(`/poses/${catalogApi.poseNamed(name).id}`);
  await expect(page.getByRole('heading', { level: 1, name, exact: true })).toBeVisible();
};

// --- The tags of the poses -------------------------------------------------------------------------------------

Given(
  /^la pose "([^"]+)" porte (?:l'étiquette|les étiquettes) ((?:"[^"]+"(?:, | et )?)+)$/,
  async ({ catalogApi, tagApi }, pose: string, names: string) => {
    catalogApi.tagPose(pose, poseTagIds(tagApi, names));
  },
);

Given(
  /^(\d+) poses publiées(?: et (\d+) transitions publiées)? portent l'étiquette "([^"]+)"$/,
  async ({ catalogApi, tagApi }, poses: string, transitions: string | undefined, name: string) => {
    const tagIds = [tagApi.tagNamed(name).id];
    for (let i = 1; i <= Number(poses); i++) catalogApi.publish({ name: `Porteuse ${i}`, tagIds });
    if (Number(transitions ?? 0) === 0) return;
    // The transitions go between two poses that carry nothing, to count only what the scenario states.
    catalogApi.publish({ name: 'Socle A' });
    catalogApi.publish({ name: 'Socle B' });
    for (let i = 1; i <= Number(transitions); i++)
      publishTransition(catalogApi, {
        from: 'Socle A',
        to: 'Socle B',
        name: `Passage ${i}`,
        base: 'débutant',
        flyer: 'débutant',
        description: null,
        tagIds,
      });
  },
);

Given(
  /^l'étiquette "([^"]+)" dans la liste des étiquettes, qui s'applique (aux poses seulement|aux transitions seulement|aux poses et aux transitions)$/,
  async ({ tagApi }, name: string, scope: string) => {
    tagApi.add(name, undefined, null, scopeOf(scope));
  },
);

Given(/^l'étiquette "([^"]+)" s'applique aux poses et aux transitions$/, async ({ tagApi }, name: string) => {
  tagApi.changeScopeElsewhere(name, 'poses-and-transitions');
});

Given(
  /^(\S+) a changé le champ d'application de l'étiquette "([^"]+)" en « (.+) »$/,
  async ({ tagApi }, _who: string, name: string, scope: string) => {
    tagApi.changeScopeElsewhere(name, scopeOf(scope));
  },
);

Given("aucune étiquette de la liste ne s'applique aux poses", async ({ tagApi }) => {
  tagApi.restrictEveryTagToTransitions();
});

// --- Reading ---------------------------------------------------------------------------------------------------

Then(
  /^la page présente la pose "([^"]+)" avec les étiquettes ((?:"[^"]+"(?:, | et )?)+)$/,
  async ({ page }, pose: string, names: string) => {
    await expect(page.getByRole('heading', { level: 1, name: pose, exact: true })).toBeVisible();
    await expect(pillsOf(hero(page))).toHaveText(quoted(names));
  },
);

Then(/^la page de la pose "([^"]+)" ne présente aucune étiquette$/, async ({ page }, pose: string) => {
  await expect(page.getByRole('heading', { level: 1, name: pose, exact: true })).toBeVisible();
  await expect(hero(page).getByText('Étiquettes', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Ce que veulent dire les étiquettes de la pose')).toHaveCount(0);
});

Then(/^la carte de la pose "([^"]+)" ne présente aucune étiquette$/, async ({ page }, pose: string) => {
  await expect(cardOf(page, pose)).toBeVisible();
  await expect(cardOf(page, pose).getByText('Étiquettes', { exact: true })).toHaveCount(0);
});

Then(
  'les poses du catalogue présentent exactement les étiquettes suivantes :',
  async ({ page }, table: { hashes(): Array<{ nom: string; étiquettes: string }> }) => {
    for (const row of table.hashes()) {
      const expected = row.étiquettes
        .split(',')
        .map((name) => name.trim())
        .filter(Boolean);
      await expect(cardOf(page, row.nom)).toBeVisible();
      await expect(pillsOf(cardOf(page, row.nom))).toHaveText(expected);
    }
  },
);

When(
  /^un visiteur déplie « Ce que veulent dire les étiquettes de la pose » sur la page de la pose "([^"]+)"$/,
  async ({ page, catalogApi }, pose: string) => {
    await openPose(page, catalogApi, pose);
    await page.getByText('Ce que veulent dire les étiquettes de la pose').click();
  },
);

// --- Tagging a published pose directly -------------------------------------------------------------------------

// Story 12: « Ajouter une vidéo à Pop to Bird » is a link to its page.
Then(/^la page de la pose invite (\S+) à « (.+) »$/, async ({ page }, _who: string, name: string) => {
  const invitation = page
    .getByRole('main')
    .getByRole('button', { name, exact: true })
    .or(page.getByRole('main').getByRole('link', { name, exact: true }));
  await expect(invitation.first()).toBeVisible();
});

Then(
  /^la page de la pose n'invite pas (\S+) à étiqueter la pose "([^"]+)"$/,
  async ({ page }, _who: string, pose: string) => {
    await expect(page.getByRole('heading', { level: 1, name: pose, exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: `Étiqueter la pose ${pose}` })).toHaveCount(0);
  },
);

const startTagging = async (page: Page, catalogApi: CatalogApi, pose: string) => {
  await openPose(page, catalogApi, pose);
  await page.getByRole('button', { name: `Étiqueter la pose ${pose}`, exact: true }).click();
};

When(
  /^(\S+) commence à étiqueter sur le site la pose "([^"]+)"$/,
  async ({ page, catalogApi }, _who: string, pose: string) => {
    await startTagging(page, catalogApi, pose);
  },
);

When(
  /^(\S+) étiquette sur le site la pose "([^"]+)" avec les étiquettes ((?:"[^"]+"(?:, | et )?)+)$/,
  async ({ page, catalogApi }, _who: string, pose: string, names: string) => {
    await startTagging(page, catalogApi, pose);
    const group = page.getByRole('group', { name: 'Étiquettes de la pose' });
    await group.getByRole('checkbox').first().waitFor();
    for (const box of (await group.getByRole('checkbox').all()).reverse()) await box.uncheck();
    for (const name of quoted(names)) await group.getByRole('checkbox', { name, exact: true }).check();
    await page.getByRole('button', { name: 'Enregistrer les étiquettes' }).click();
    await group.waitFor({ state: 'detached' });
  },
);

Then(
  /^le site propose exactement les étiquettes ((?:"[^"]+"(?:, | et )?)+)$/,
  async ({ page }, names: string) => {
    const group = page.getByRole('group', { name: 'Étiquettes de la pose' });
    await expect(group.getByRole('checkbox')).toHaveCount(quoted(names).length);
    for (const name of quoted(names))
      await expect(group.getByRole('checkbox', { name, exact: true })).toBeVisible();
  },
);

Then(
  /^le site propose à (\S+) d'ouvrir les propositions à valider, sans lui permettre d'enregistrer les étiquettes de la pose$/,
  async ({ page }, _who: string) => {
    await expect(
      page.getByRole('main').getByRole('alert').getByRole('link', { name: 'Propositions à valider' }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Enregistrer les étiquettes' })).toHaveCount(0);
  },
);

Then(/^le site annonce « (.+) »$/, async ({ page }, text: string) => {
  await expect(page.getByRole('status').filter({ hasText: text })).not.toHaveCount(0);
});

// --- The page « Étiquettes » -----------------------------------------------------------------------------------

const onTagsPage = async (page: Page, open: () => Promise<void>) => {
  if (new URL(page.url()).pathname !== tagsPath) await open();
};

When(
  /^(\S+) ajoute sur le site l'étiquette "([^"]+)" avec la description « ([^»]+) », qui s'applique (aux poses seulement|aux transitions seulement|aux poses et aux transitions)$/,
  async ({ page, tagsPage }, _who: string, name: string, description: string, scope: string) => {
    await onTagsPage(page, () => tagsPage.open());
    await tagsPage.add(name, description, scopeOf(scope));
  },
);

When(
  /^(\S+) ajoute sur le site l'étiquette "([^"]+)" avec la description « ([^»]+) », sans choisir à quoi elle s'applique$/,
  async ({ page, tagsPage }, _who: string, name: string, description: string) => {
    await onTagsPage(page, () => tagsPage.open());
    await tagsPage.add(name, description, null);
  },
);

When(
  /^(\S+) change sur le site le champ d'application de l'étiquette "([^"]+)" en « (.+) »$/,
  async ({ page, tagsPage }, _who: string, name: string, scope: string) => {
    await onTagsPage(page, () => tagsPage.open());
    await tagsPage.change(name, { scope: scopeOf(scope) });
  },
);

Then(
  /^le site présente (?:l'étiquette "([^"]+)" avec|pour l'étiquette "([^"]+)") « (.+) »$/,
  async ({ tagsPage }, withName: string | undefined, forName: string | undefined, text: string) => {
    await expect(tagsPage.tag((withName ?? forName)!).getByText(text, { exact: true })).toBeVisible();
  },
);

Then(
  /^le site indique que l'étiquette "([^"]+)" ne peut pas (cesser de s'appliquer aux poses|être retirée) car la pose « (.+) » la porte, avec un lien vers la pose "([^"]+)"$/,
  async ({ tagsPage, catalogApi }, name: string, what: string, pose: string, linked: string) => {
    const alert = tagsPage.tag(name).getByRole('alert');
    await expect(alert).toContainText(`« ${name} » ne peut pas ${what}`);
    await expect(alert.getByText('Poses du catalogue', { exact: true })).toBeVisible();
    await expect(alert.getByRole('link', { name: pose, exact: true })).toHaveAttribute(
      'href',
      `/poses/${catalogApi.poseNamed(linked).id}`,
    );
  },
);

// --- The tags of the transitions: never a tag reserved to the poses -------------------------------------------

Then(/^le formulaire de transition ne propose pas l'étiquette "([^"]+)"$/, async ({ page }, name: string) => {
  const form = page.getByRole('form', { name: 'Proposer une transition' });
  await expect(form.getByRole('checkbox').first()).toBeVisible();
  await expect(form.getByRole('checkbox', { name, exact: true })).toHaveCount(0);
});

When(
  /^(\S+) commence à étiqueter sur le site, depuis la pose "([^"]+)", la transition « (.+) »$/,
  async ({ page, catalogApi }, _who: string, pose: string, transition: string) => {
    await openPose(page, catalogApi, pose);
    await page.getByRole('button', { name: `Étiqueter ${transition}`, exact: true }).click();
  },
);

Then(/^le site ne propose pas l'étiquette "([^"]+)"$/, async ({ page }, name: string) => {
  await expect(page.getByRole('checkbox').first()).toBeVisible();
  await expect(page.getByRole('checkbox', { name, exact: true })).toHaveCount(0);
});
