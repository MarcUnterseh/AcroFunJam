import { expect } from '@playwright/test';
import { Given, Then, When } from '../fixtures';
import { tagsPath } from '../pages/tags-page';
import { publishTransition } from './pose-page.steps';

// Story 8 « Étiquettes », part 1: scenarios @web of gerer-la-liste-des-etiquettes.feature.

const quoted = (names: string) => [...names.matchAll(/"([^"]+)"/g)].map((match) => match[1]!);

// --- The list and the transitions carrying its tags ------------------------------------------------

Given(
  /^l'étiquette "([^"]+)" dans la liste des étiquettes, avec la description « (.+) »$/,
  async ({ tagApi }, name: string, description: string) => {
    tagApi.add(name, description);
  },
);

Given(/^l'étiquette "([^"]+)" dans la liste des étiquettes$/, async ({ tagApi }, name: string) => {
  tagApi.add(name);
});

Given(
  /^les étiquettes ((?:"[^"]+"(?:, | et )?)+) dans la liste des étiquettes$/,
  async ({ tagApi }, names: string) => {
    for (const name of quoted(names)) tagApi.add(name);
  },
);

Given(
  /^la transition publiée (?:sans nom|"([^"]+)") de "([^"]+)" vers "([^"]+)", avec l'étiquette "([^"]+)"$/,
  async ({ catalogApi, tagApi }, name: string | null | undefined, from: string, to: string, tag: string) => {
    publishTransition(catalogApi, {
      from,
      to,
      name: name ?? null,
      base: 'débutant',
      flyer: 'débutant',
      description: null,
      tagIds: [tagApi.tagNamed(tag).id],
    });
  },
);

// --- Opening the page --------------------------------------------------------------------------------

When('le visiteur ouvre la liste des étiquettes depuis le catalogue', async ({ page, tagsPage }) => {
  await page.getByRole('link', { name: 'Étiquettes', exact: true }).click();
  await tagsPage.loaded();
});

When(
  '{word} ouvre la gestion des étiquettes depuis les propositions à valider',
  async ({ page, tagsPage }, _name: string) => {
    await page.getByRole('link', { name: 'Gérer les étiquettes' }).click();
    await tagsPage.loaded();
  },
);

// --- Managing ----------------------------------------------------------------------------------------

/** Acts on the page, opening it first if needed. */
const onThePage = async (page: import('@playwright/test').Page, open: () => Promise<void>) => {
  if (new URL(page.url()).pathname !== tagsPath) await open();
};

When(
  /^(\S+) ajoute sur le site l'étiquette "([^"]+)" avec la description « ([^»]+) »$/,
  async ({ page, tagsPage }, _name: string, tag: string, description: string) => {
    await onThePage(page, () => tagsPage.open());
    await tagsPage.add(tag, description);
  },
);

When(
  /^(\S+) renomme sur le site l'étiquette "([^"]+)" en "([^"]+)"$/,
  async ({ page, tagsPage }, _name: string, tag: string, newName: string) => {
    await onThePage(page, () => tagsPage.open());
    await tagsPage.change(tag, { name: newName });
  },
);

When(
  /^(\S+) change sur le site la description de l'étiquette "([^"]+)" en « (.+) »$/,
  async ({ page, tagsPage }, _name: string, tag: string, description: string) => {
    await onThePage(page, () => tagsPage.open());
    await tagsPage.change(tag, { description });
  },
);

When(
  /^(\S+) retire sur le site l'étiquette "([^"]+)" en confirmant le retrait$/,
  async ({ page, tagsPage }, _name: string, tag: string) => {
    await onThePage(page, () => tagsPage.open());
    await tagsPage.removeConfirming(tag);
  },
);

// --- Outcomes ----------------------------------------------------------------------------------------

Then(
  /^le site présente l'étiquette "([^"]+)" avec la description « (.+) »$/,
  async ({ tagsPage }, name: string, description: string) => {
    await expect(tagsPage.tag(name).getByText(description, { exact: true })).toBeVisible();
  },
);

Then(/^le site présente l'étiquette "([^"]+)"$/, async ({ tagsPage }, name: string) => {
  await expect(tagsPage.tag(name)).toBeVisible();
});

Then(
  /^le site présente l'étiquette "([^"]+)" sans inviter (\S+) à ajouter, modifier ni retirer d'étiquette$/,
  async ({ page, tagsPage }, name: string, _person: string) => {
    await expect(tagsPage.tag(name)).toBeVisible();
    await expect(tagsPage.addPanel).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^(Modifier|Retirer) / })).toHaveCount(0);
  },
);

Then(
  /^le site présente la liste des étiquettes et invite (\S+) à ajouter une étiquette$/,
  async ({ tagsPage }, _person: string) => {
    await expect(tagsPage.title).toBeVisible();
    await expect(tagsPage.addPanel.getByRole('button', { name: "Ajouter l'étiquette" })).toBeVisible();
  },
);

Then(
  "le site indique pour le nom qu'une étiquette de ce nom existe déjà dans la liste",
  async ({ tagsPage }) => {
    await expect(tagsPage.addPanel.getByLabel('Nom')).toHaveAccessibleDescription(
      /Une étiquette de ce nom existe déjà dans la liste\./,
    );
  },
);

Then(
  /^le site présente exactement les étiquettes ((?:"[^"]+"(?:, | et )?)+)$/,
  async ({ tagsPage }, names: string) => {
    await expect.poll(() => tagsPage.names()).toEqual(quoted(names));
  },
);

Then(
  /^le site indique que l'étiquette "([^"]+)" est portée par (\d+) transitions?$/,
  async ({ tagsPage }, name: string, count: string) => {
    await expect(
      tagsPage
        .tag(name)
        .getByText(`Portée par ${count} ${count === '1' ? 'transition' : 'transitions'}`, { exact: true }),
    ).toBeVisible();
  },
);

Then(
  /^le site indique que l'étiquette "([^"]+)" ne peut pas être retirée car la transition « (.+) » la porte, avec un lien vers la pose "([^"]+)"$/,
  async ({ tagsPage, catalogApi }, name: string, transition: string, pose: string) => {
    const alert = tagsPage.tag(name).getByRole('alert');
    await expect(alert).toContainText(`« ${name} » ne peut pas être retirée`);
    await expect(alert.getByText(transition, { exact: true })).toBeVisible();
    await expect(alert.getByRole('link', { name: `Voir la pose ${pose}` })).toHaveAttribute(
      'href',
      `/poses/${catalogApi.poseNamed(pose).id}`,
    );
  },
);
