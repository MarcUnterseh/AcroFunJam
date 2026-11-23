import { expect, type Locator, type Page } from '@playwright/test';
import type { DataTable } from 'playwright-bdd';
import { Given, Then, When } from '../fixtures';
import type { AddPhotoForm } from '../pages/add-photo-form';
import { posePath } from '../pages/pose-page';
import type { CatalogApi } from '../support/catalog-api';
import { dimensionsNamed, fileNamed } from '../support/photo-files';
import type { PhotoApi } from '../support/photo-api';
import { beforeTheIncidents, setAcroFunJamReachable, type SimulatedApis } from '../support/reachability';

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Story 10 « Photos des poses »: scenarios @web of catalogue/ajouter-des-photos-a-une-pose.feature and
// catalogue/consulter-les-photos-des-poses.feature.

/** « « Bird vue de face », « Bird, les prises » »: the texts between French quotes. */
const quotedTexts = (texts: string) => [...texts.matchAll(/« ([^»]+) »/g)].map((match) => match[1]!);

const loaded = (page: Page) => page.locator('.pose-page--loaded');

/** « Photos de Bird »: the top of the body, with the main photo (or the invitation of a pose without photo). */
const mainSection = (page: Page, pose?: string) =>
  page.getByRole('region', { name: pose ? `Photos de ${pose}` : /^Photos de /, exact: true });

/** « Autres photos de Bird »: the last section of the page. */
const otherSection = (page: Page, title: string) => page.getByRole('region', { name: title, exact: true });

/** A photo presented on the page: its figure, found by its alternative text. */
const figureOf = (scope: Page | Locator, altText: string) => {
  // The inner locator of « has » is resolved from the figure: it must start from the page.
  const page = 'goto' in scope ? scope : scope.page();
  return scope.locator('figure').filter({ has: page.getByAltText(altText, { exact: true }) });
};

/** A photo with what goes with it for a validator: its mark, its management. */
const itemOf = (page: Page, altText: string) =>
  page.locator('.pose-photo-item').filter({ has: page.getByAltText(altText, { exact: true }) });

/** The alternative texts of the photos presented in this scope, in the order of the page. */
const altTextsIn = (scope: Locator) =>
  scope.locator('figure img').evaluateAll((images) => images.map((image) => image.getAttribute('alt')));

const cardOf = (page: Page, name: string) =>
  page.locator('.pose-card').filter({ has: page.getByRole('heading', { level: 2, name, exact: true }) });

const openPose = async (page: Page, catalogApi: CatalogApi, name: string) => {
  await page.goto(posePath(catalogApi.poseNamed(name).id));
  await expect(page.getByRole('heading', { level: 1, name, exact: true })).toBeVisible();
};

/** The photos of a table « fichier | texte alternatif | crédit », given to the simulated catalog in their order. */
const addPhotos = (photoApi: PhotoApi, pose: string, rows: DataTable) => {
  for (const row of rows.hashes())
    photoApi.add(pose, {
      altText: row['texte alternatif']!,
      credit: row['crédit']!,
      ...dimensionsNamed(row['fichier']!),
    });
};

/** « N photos »: photos of a pose added before the scenario, the given one last. */
const addSomePhotos = (photoApi: PhotoApi, pose: string, count: number, last?: string) => {
  for (let i = 1; i <= count; i++)
    photoApi.add(pose, {
      altText: i === count && last ? last : `${pose}, photo ${i}`,
      credit: 'Léa Martin',
      width: 1600,
      height: 1200,
    });
};

// --- The photos of the scenario ---------------------------------------------------------------------------------

Given('AcroFunJam est injoignable', async ({ identityApi, catalogApi, contributionApi }) =>
  setAcroFunJamReachable({ identityApi, catalogApi, contributionApi }, false),
);

Given(
  /^la pose "([^"]+)" a pour photos, dans cet ordre :$/,
  async ({ photoApi }, pose: string, rows: DataTable) => addPhotos(photoApi, pose, rows),
);

Given(
  /^la pose "([^"]+)" a déjà (\d+) photos?(?:, dont « ([^»]+) »)?$/,
  async ({ photoApi }, pose: string, count: string, last: string | undefined) =>
    addSomePhotos(photoApi, pose, Number(count), last),
);

Given(
  /^(\S+) a ajouté à la pose "([^"]+)" (une photo \S+ de [\d,]+ Mo de \d+×\d+), avec le texte alternatif « ([^»]+) » et le crédit « ([^»]+) »$/,
  async ({ photoApi }, _who: string, pose: string, file: string, altText: string, credit: string) => {
    photoApi.add(pose, { altText, credit, ...dimensionsNamed(file) });
  },
);

Given(
  /^(\S+) a retiré de la pose "([^"]+)" la photo « ([^»]+) »$/,
  async ({ photoApi }, _who: string, pose: string, altText: string) =>
    photoApi.removeElsewhere(pose, altText),
);

// --- The page « Ajouter une photo » -----------------------------------------------------------------------------

/**
 * The page « Ajouter une photo de Throne », opened from the page of the pose as it was before the incidents of the
 * scenario (outage, expired session): the incident happens while the page is open.
 */
const openAddPhotoPage = async (
  page: Page,
  apis: SimulatedApis,
  addPhotoForm: AddPhotoForm,
  pose: string,
): Promise<void> =>
  beforeTheIncidents(apis, async () => {
    await openPose(page, apis.catalogApi, pose);
    await page
      .getByRole('main')
      .getByRole('link', { name: `Ajouter une photo de ${pose}`, exact: true })
      .click();
    await expect(addPhotoForm.title(pose)).toBeVisible();
    await expect(addPhotoForm.form).toBeVisible();
  });

const defaultAltText = (pose: string) => `${pose} vu de profil`;
const defaultCredit = 'Léa Martin';

When(
  /^(\S+) ajoute sur le site, depuis la pose "([^"]+)", (une photo \S+ de [\d,]+ Mo de \d+×\d+)(?:, (.+))?$/,
  async (
    { page, identityApi, catalogApi, contributionApi, addPhotoForm },
    _who: string,
    pose: string,
    file: string,
    details: string | undefined,
  ) => {
    await openAddPhotoPage(page, { identityApi, catalogApi, contributionApi }, addPhotoForm, pose);
    const texts = details && /^avec le texte alternatif « ([^»]+) » et le crédit « ([^»]+) »$/.exec(details);
    if (details !== 'sans choisir de fichier') await addPhotoForm.choose(await fileNamed(page, file));
    await addPhotoForm.fill({
      altText: texts ? texts[1] : details === 'sans texte alternatif' ? '' : defaultAltText(pose),
      credit: texts ? texts[2] : details === 'sans crédit' ? '' : defaultCredit,
      rights: details !== 'sans cocher la case des droits',
    });
    await addPhotoForm.submit();
  },
);

When(
  /^(\S+) commence à ajouter sur le site une photo de la pose "([^"]+)"(?:, avec le texte alternatif « ([^»]+) »)?$/,
  async (
    { page, identityApi, catalogApi, contributionApi, addPhotoForm },
    _who: string,
    pose: string,
    altText: string | undefined,
  ) => {
    await openAddPhotoPage(page, { identityApi, catalogApi, contributionApi }, addPhotoForm, pose);
    if (altText) await addPhotoForm.fill({ altText });
  },
);

When(
  /^(\S+) choisit sur le site, pour la pose "([^"]+)", (.+), avec le texte alternatif « ([^»]+) » et le crédit « ([^»]+) »$/,
  async (
    { page, identityApi, catalogApi, contributionApi, addPhotoForm },
    _who: string,
    pose: string,
    file: string,
    altText: string,
    credit: string,
  ) => {
    await openAddPhotoPage(page, { identityApi, catalogApi, contributionApi }, addPhotoForm, pose);
    await addPhotoForm.fill({ altText, credit, rights: true });
    await addPhotoForm.choose(await fileNamed(page, file));
  },
);

When(/^(\S+) annule l'ajout$/, async ({ addPhotoForm }, _who: string) => addPhotoForm.cancel());

Then(
  /^le site présente la page de la pose "([^"]+)" et annonce « (.+) »$/,
  async ({ page, catalogApi }, pose: string, text: string) => {
    await expect(page.getByRole('heading', { level: 1, name: pose, exact: true })).toBeVisible();
    expect(new URL(page.url()).pathname).toBe(posePath(catalogApi.poseNamed(pose).id));
    await expect(page.getByRole('status').filter({ hasText: text })).not.toHaveCount(0);
  },
);

Then(/^la case « (.+) » n'est pas cochée$/, async ({ addPhotoForm }, label: string) => {
  await expect(addPhotoForm.form.getByRole('checkbox', { name: label, exact: true })).not.toBeChecked();
});

Then(/^le site explique « (.+) »$/, async ({ page }, text: string) => {
  await expect(page.getByRole('main').getByText(text, { exact: true })).toBeVisible();
});

Then(/^le site signale, sous le champ de la photo, (.+)$/, async ({ addPhotoForm }, message: string) => {
  const quoted = /^« (.+) »$/.exec(message);
  if (quoted) await expect(addPhotoForm.fileError).toHaveText(quoted[1]!);
  else if (message === 'que la photo dépasse 10 Mo')
    await expect(addPhotoForm.fileError).toContainText('10 Mo');
  else throw new Error(`Message inconnu : ${message}`);
});

Then(/^le site signale « (.+) »$/, async ({ page }, text: string) => {
  await expect(page.getByRole('main').getByText(text, { exact: true }).first()).toBeVisible();
});

Then(
  /^le texte alternatif « ([^»]+) », le crédit « ([^»]+) » et la case des droits sont conservés$/,
  async ({ addPhotoForm }, altText: string, credit: string) => {
    expect(addPhotoForm.input).toMatchObject({ altText, credit, rights: true });
    await addPhotoForm.expectKept();
  },
);

Then(/^la saisie de la photo de (.+) est conservée$/, async ({ addPhotoForm }, _pose: string) =>
  addPhotoForm.expectKept(),
);

Then(
  /^la photo choisie, le texte alternatif « ([^»]+) » et le crédit « ([^»]+) » sont conservés$/,
  async ({ addPhotoForm }, altText: string, credit: string) => {
    expect(addPhotoForm.input).toMatchObject({ altText, credit });
    expect(addPhotoForm.input.file).not.toBeNull();
    await addPhotoForm.expectKept();
  },
);

Then(
  /^le site demande « (.+) », avec « (.+) » et « (.+) »$/,
  async ({ page }, question: string, a: string, b: string) => {
    const group = page.getByRole('group', { name: question, exact: true });
    await expect(group).toBeVisible();
    await expect(group.getByRole('button', { name: a, exact: true })).toBeVisible();
    await expect(group.getByRole('button', { name: b, exact: true })).toBeVisible();
  },
);

// --- The invitation to add a photo ------------------------------------------------------------------------------

Then(
  /^la page de la pose indique en tête, à la place de la photo principale, « (.+) »$/,
  async ({ page }, text: string) => {
    const section = mainSection(page);
    await expect(section.getByText(text, { exact: true })).toBeVisible();
    await expect(section.locator('figure')).toHaveCount(0);
  },
);

Then(
  /^la page de la pose invite (\S+) à « Ajouter une photo de (.+) », (en tête de la page|sous la photo principale)$/,
  async ({ page }, _who: string, pose: string, where: string) => {
    const section = mainSection(page, pose);
    await expect(
      section.getByRole('link', { name: `Ajouter une photo de ${pose}`, exact: true }),
    ).toBeVisible();
    await expect(section.locator('figure')).toHaveCount(where === 'sous la photo principale' ? 1 : 0);
  },
);

Then(/^la page de la pose indique « (.+) »$/, async ({ page }, text: string) => {
  await expect(mainSection(page).getByText(text, { exact: true })).toBeVisible();
});

Then(/^la page ne présente pas de section « (.+) »$/, async ({ page }, title: string) => {
  await expect(loaded(page)).toBeVisible();
  await expect(mainSection(page).locator('figure')).not.toHaveCount(0);
  await expect(otherSection(page, title)).toHaveCount(0);
});

Then(
  /^la page de la pose n'invite pas (\S+) à ajouter une photo de (.+)$/,
  async ({ page }, _who: string, pose: string) => {
    // The session is known once the invitation to propose a modification appears (a user and a validator may propose).
    await expect(
      page.getByRole('main').getByRole('link', { name: 'Proposer une modification' }),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: `Ajouter une photo de ${pose}`, exact: true })).toHaveCount(
      0,
    );
  },
);

Then(/^la section « (.+) » indique « (.+) »$/, async ({ page }, title: string, text: string) => {
  await expect(otherSection(page, title).getByText(text, { exact: true })).toBeVisible();
});

Then(
  /^la section « (.+) » invite (\S+) à « (.+) »$/,
  async ({ page }, title: string, _who: string, name: string) => {
    await expect(otherSection(page, title).getByRole('link', { name, exact: true })).toBeVisible();
  },
);

// --- Managing the photos of a pose ------------------------------------------------------------------------------

When(
  /^(\S+) (retire|commence à retirer) sur le site la photo « ([^»]+) » de la pose "([^"]+)"(, après confirmation)?$/,
  async (
    { page, catalogApi },
    _who: string,
    _action: string,
    altText: string,
    pose: string,
    confirmed?: string,
  ) => {
    await openPose(page, catalogApi, pose);
    await page.getByRole('button', { name: `Retirer la photo : ${altText}`, exact: true }).click();
    if (!confirmed) return;
    await page.getByRole('button', { name: 'Retirer la photo', exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: `Photo retirée de ${pose}.` })).not.toHaveCount(
      0,
    );
  },
);

When(
  /^(\S+) choisit sur le site « ([^»]+) » comme photo principale de la pose "([^"]+)"$/,
  async ({ page, catalogApi }, _who: string, altText: string, pose: string) => {
    await openPose(page, catalogApi, pose);
    await page
      .getByRole('button', { name: `Choisir comme photo principale : ${altText}`, exact: true })
      .click();
    await expect(
      page
        .getByRole('status')
        // The site puts narrow no-break spaces inside the quotation marks: any space matches.
        .filter({
          hasText: new RegExp(
            `«\\s${escapeRegExp(altText)}\\s» est maintenant la photo principale de ${escapeRegExp(pose)}\\.`,
          ),
        }),
    ).not.toHaveCount(0);
  },
);

When(
  /^(\S+) modifie sur le site la photo « ([^»]+) » de la pose "([^"]+)" avec le texte alternatif « ([^»]+) » et le crédit « ([^»]+) »$/,
  async (
    { page, catalogApi },
    _who: string,
    altText: string,
    pose: string,
    newAltText: string,
    credit: string,
  ) => {
    await openPose(page, catalogApi, pose);
    await page
      .getByRole('button', { name: `Modifier le texte alternatif et le crédit : ${altText}`, exact: true })
      .click();
    const zone = page.getByRole('group', { name: 'Texte alternatif et crédit', exact: true });
    await zone.getByRole('textbox', { name: 'Texte alternatif', exact: true }).fill(newAltText);
    await zone.getByRole('textbox', { name: 'Crédit', exact: true }).fill(credit);
    await zone.getByRole('button', { name: 'Enregistrer', exact: true }).click();
    await expect(
      page.getByRole('status').filter({ hasText: 'Texte alternatif et crédit enregistrés.' }),
    ).not.toHaveCount(0);
  },
);

Then(/^la photo « ([^»]+) » est marquée « (.+) »$/, async ({ page }, altText: string, mark: string) => {
  const item = itemOf(page, altText);
  await expect(item.getByText(new RegExp(`^${mark}`))).toBeVisible();
  // The main photo is the one at the top of the page.
  await expect(mainSection(page).getByAltText(altText, { exact: true })).toBeVisible();
});

Then(
  /^aucune photo de la pose "([^"]+)" n'est marquée « (.+) »$/,
  async ({ page, photoApi }, pose: string, mark: string) => {
    await expect(mainSection(page, pose).locator('figure')).toHaveCount(1);
    await expect(otherSection(page, `Autres photos de ${pose}`).locator('figure')).toHaveCount(
      photoApi.of(pose).length - 1,
    );
    await expect(page.getByRole('main').getByText(new RegExp(`^${mark}`))).toHaveCount(0);
  },
);

Then(
  /^la page de la pose propose, sous la photo principale « ([^»]+) », de la modifier ou de la retirer$/,
  async ({ page }, altText: string) => {
    const section = mainSection(page);
    await expect(section.getByAltText(altText, { exact: true })).toBeVisible();
    await expect(
      section.getByRole('button', {
        name: `Modifier le texte alternatif et le crédit : ${altText}`,
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      section.getByRole('button', { name: `Retirer la photo : ${altText}`, exact: true }),
    ).toBeVisible();
    await expect(section.getByRole('button', { name: /^Choisir comme photo principale/ })).toHaveCount(0);
  },
);

Then(
  /^la section « (.+) » propose, pour la photo « ([^»]+) », de la choisir comme photo principale, de la modifier ou de la retirer$/,
  async ({ page }, title: string, altText: string) => {
    const item = otherSection(page, title)
      .locator('li')
      .filter({ has: page.getByAltText(altText, { exact: true }) });
    for (const name of [
      `Choisir comme photo principale : ${altText}`,
      `Modifier le texte alternatif et le crédit : ${altText}`,
      `Retirer la photo : ${altText}`,
    ])
      await expect(item.getByRole('button', { name, exact: true })).toBeVisible();
  },
);

Then(/^le site demande « (.+) » et précise « (.+) »$/, async ({ page }, question: string, text: string) => {
  const zone = page.getByRole('group', { name: question, exact: true });
  await expect(zone).toBeVisible();
  await expect(zone.getByText(text, { exact: true })).toBeVisible();
});

// --- The photos presented ---------------------------------------------------------------------------------------

Then(
  /^la page présente les photos de la pose "([^"]+)" dans cet ordre : (« .+ »)$/,
  async ({ page }, pose: string, texts: string) => {
    await expect(page.getByRole('heading', { level: 1, name: pose, exact: true })).toBeVisible();
    await expect.poll(() => altTextsIn(page.getByRole('main'))).toEqual(quotedTexts(texts));
  },
);

Then(
  /^la page présente la pose "([^"]+)" avec la photo « ([^»]+) », créditée « (.+) »$/,
  async ({ page }, pose: string, altText: string, credit: string) => {
    await expect(page.getByRole('heading', { level: 1, name: pose, exact: true })).toBeVisible();
    const figure = figureOf(page, altText);
    await expect(figure).toBeVisible();
    await expect(figure.locator('figcaption')).toHaveText(credit);
  },
);

Then(
  /^la page présente la pose "([^"]+)" avec exactement les photos :$/,
  async ({ page }, pose: string, rows: DataTable) => {
    await expect(page.getByRole('heading', { level: 1, name: pose, exact: true })).toBeVisible();
    const expected = rows.hashes();
    await expect
      .poll(() => altTextsIn(page.getByRole('main')))
      .toEqual(expected.map((row) => row['texte alternatif']));
    for (const row of expected)
      await expect(figureOf(page, row['texte alternatif']!).locator('figcaption')).toHaveText(
        `Photo : ${row['crédit']}`,
      );
  },
);

Then(
  /^la pose "([^"]+)" présente (\d+) photos?$/,
  async ({ page, catalogApi }, pose: string, count: string) => {
    expect(new URL(page.url()).pathname).toBe(posePath(catalogApi.poseNamed(pose).id));
    await expect(page.getByRole('heading', { level: 1, name: pose, exact: true })).toBeVisible();
    await expect(page.getByRole('main').locator('figure')).toHaveCount(Number(count));
  },
);

Then(
  /^la page de la pose présente en tête la seule photo « ([^»]+) »(?:, avec le crédit « (.+) »)?$/,
  async ({ page }, altText: string, credit: string | undefined) => {
    const section = mainSection(page);
    await expect(section.locator('figure')).toHaveCount(1);
    await expect(section.getByAltText(altText, { exact: true })).toBeVisible();
    if (credit) await expect(figureOf(section, altText).locator('figcaption')).toHaveText(credit);
  },
);

Then(
  /^la page de la pose présente, sous la photo principale, le lien « (.+) »$/,
  async ({ page }, name: string) => {
    const section = mainSection(page);
    await expect(section.locator('figure')).toHaveCount(1);
    await expect(section.getByRole('link', { name, exact: true })).toBeVisible();
  },
);

Then(
  /^la section « (.+) », après les transitions, présente dans cet ordre (« .+ »)$/,
  async ({ page }, title: string, texts: string) => {
    const section = otherSection(page, title);
    await expect.poll(() => altTextsIn(section)).toEqual(quotedTexts(texts));
    const pose = title.replace(/^Autres photos de /, '');
    const transitions = page.getByRole('region', { name: `Transitions vers ${pose}`, exact: true });
    const follows = await transitions.evaluate(
      (before, after) => !!(before.compareDocumentPosition(after as Node) & Node.DOCUMENT_POSITION_FOLLOWING),
      await section.elementHandle(),
    );
    expect(follows).toBe(true);
  },
);

Then(
  /^le site présente la photo « ([^»]+) » avec le crédit « (.+) »$/,
  async ({ page }, altText: string, credit: string) => {
    await expect(figureOf(page, altText).locator('figcaption')).toHaveText(credit);
  },
);

const morePhotosLink = /^Voir (?:les \d+ autres photos|l'autre photo)$/;

Then(
  /^la page de la pose ne présente ni lien vers d'autres photos ni section « (.+) »$/,
  async ({ page }, title: string) => {
    await expect(mainSection(page).locator('figure')).toHaveCount(1);
    await expect(page.getByRole('link', { name: morePhotosLink })).toHaveCount(0);
    await expect(otherSection(page, title)).toHaveCount(0);
  },
);

Then(
  /^la page de la pose ne présente ni photo principale, ni lien vers d'autres photos, ni section « (.+) »$/,
  async ({ page }, title: string) => {
    await expect(loaded(page)).toBeVisible();
    await expect(mainSection(page)).toHaveCount(0);
    await expect(page.getByRole('main').locator('figure')).toHaveCount(0);
    await expect(page.getByRole('link', { name: morePhotosLink })).toHaveCount(0);
    await expect(otherSection(page, title)).toHaveCount(0);
  },
);

// --- The thumbnails of the catalog ------------------------------------------------------------------------------

Then(
  /^la carte de la pose "([^"]+)" présente une vignette carrée à côté du nom de la pose$/,
  async ({ page }, pose: string) => {
    const card = cardOf(page, pose);
    const thumbnail = card.locator('img');
    await expect(thumbnail).toBeVisible();
    await expect
      .poll(() => thumbnail.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0))
      .toBe(true);
    const box = (await thumbnail.boundingBox())!;
    const name = (await card.getByRole('heading', { level: 2, name: pose, exact: true }).boundingBox())!;
    expect(Math.abs(box.width - box.height)).toBeLessThanOrEqual(1);
    // Beside the name: on the same line, not under it.
    expect(box.y).toBeLessThan(name.y + name.height);
    expect(box.y + box.height).toBeGreaterThan(name.y);
  },
);

Then(
  /^la carte de la pose "([^"]+)" ne présente aucune vignette ni espace réservé$/,
  async ({ page }, pose: string) => {
    await expect(cardOf(page, 'Bird').locator('img')).toBeVisible();
    const card = cardOf(page, pose);
    await expect(card).toBeVisible();
    await expect(card.locator('img, .pose-card__thumbnail')).toHaveCount(0);
  },
);

Then(
  /^la vignette de la carte de la pose "([^"]+)" est décorative pour les lecteurs d'écran$/,
  async ({ page }, pose: string) => {
    const card = cardOf(page, pose);
    await expect(card.locator('img')).toHaveAttribute('alt', '');
    await expect(card.getByRole('img')).toHaveCount(0);
  },
);

// --- The enlargement --------------------------------------------------------------------------------------------

const enlarge = async (page: Page, catalogApi: CatalogApi, pose: string, altText: string) => {
  await openPose(page, catalogApi, pose);
  await page.getByRole('button', { name: `Agrandir la photo : ${altText}`, exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
};

Given(
  /^un visiteur a agrandi la photo « ([^»]+) » sur la page de la pose "([^"]+)"$/,
  async ({ page, catalogApi }, altText: string, pose: string) => enlarge(page, catalogApi, pose, altText),
);

When(
  /^un visiteur agrandit la photo « ([^»]+) » sur la page de la pose "([^"]+)"$/,
  async ({ page, catalogApi }, altText: string, pose: string) => enlarge(page, catalogApi, pose, altText),
);

When('le visiteur passe à la photo suivante', async ({ page }) => {
  await page.getByRole('dialog').getByRole('button', { name: 'Photo suivante', exact: true }).click();
});

When('le visiteur revient en arrière', async ({ page }) => {
  await page.goBack();
});

Then(
  /^le site présente en grand la photo « ([^»]+) », (?:« ([^»]+) »|avec le crédit « ([^»]+) »)$/,
  async ({ page }, title: string, altText: string | undefined, credit: string | undefined) => {
    const dialog = page.getByRole('dialog', { name: title, exact: true });
    await expect(dialog).toBeVisible();
    if (altText) await expect(dialog.getByAltText(altText, { exact: true })).toBeVisible();
    if (credit) await expect(dialog.getByText(credit, { exact: true })).toBeVisible();
  },
);

Then(
  "le visiteur peut fermer l'agrandissement, ou passer à la photo précédente ou à la photo suivante",
  async ({ page }) => {
    const dialog = page.getByRole('dialog');
    for (const name of ['Fermer', 'Photo précédente', 'Photo suivante']) {
      const button = dialog.getByRole('button', { name, exact: true });
      await expect(button).toBeVisible();
      await expect(button).not.toHaveAttribute('aria-disabled', 'true');
    }
  },
);

Then(
  /^le site présente la page de la pose "([^"]+)", sans agrandissement$/,
  async ({ page, catalogApi }, pose: string) => {
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByRole('heading', { level: 1, name: pose, exact: true })).toBeVisible();
    expect(new URL(page.url()).pathname).toBe(posePath(catalogApi.poseNamed(pose).id));
    expect(new URL(page.url()).searchParams.get('photo')).toBeNull();
  },
);
