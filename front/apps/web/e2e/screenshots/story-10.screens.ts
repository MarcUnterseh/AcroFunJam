import { expect, type Page, type TestInfo } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { AddPhotoForm } from '../pages/add-photo-form';
import { CatalogPage } from '../pages/catalog-page';
import { posePath } from '../pages/pose-page';
import { PhotoApi } from '../support/photo-api';
import { fileNamed } from '../support/photo-files';
import { setAcroFunJamReachable } from '../support/reachability';
import { signIn, test as base, type SimulatedSite } from './simulated-site';

// Story 10 « Photos des poses » (docs/design/ecrans/10-photos-des-poses.md): the catalog with its thumbnails, the page
// of a pose with its photos (visitor and validator), the enlargement and the page « Ajouter une photo de Throne » in
// their key states, at 320 px and 1280 px wide, light and dark themes. Output: screenshots/story-10/.
// Besides the whole page (`shoot`), `shootView` takes only what the window shows (« -view » screens: the top of the
// page as it opens, or the bottom once scrolled).

const bruno = 'bruno@example.org';

/** The simulated photos, started after the rest of the site so that their routes come first. */
const test = base.extend<{ photoApi: PhotoApi; shootView: (screen: string) => Promise<void> }>({
  photoApi: async ({ context, site }, use) => {
    const api = new PhotoApi(context, site.identityApi, site.catalogApi);
    await api.start();
    await use(api);
  },
  shootView: async ({ page }, use, testInfo) => {
    await use((screen) => shootViewport(page, testInfo, screen));
  },
});

const screenshotsRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../screenshots');

const shootViewport = async (page: Page, testInfo: TestInfo, screen: string) => {
  const story = path.basename(testInfo.file).replace(/\.screens\.ts$/, '');
  await page.screenshot({
    path: path.join(screenshotsRoot, story, `${screen}-${testInfo.project.name}.png`),
    fullPage: false,
    caret: 'hide',
    animations: 'disabled',
  });
};

const birdPhotos = [
  { altText: 'Bird vue de profil', credit: 'Léa Martin', width: 1600, height: 1200 },
  { altText: 'Bird vue de face', credit: 'Hugo Bernard', width: 1200, height: 1600 },
  { altText: 'Bird, les prises', credit: 'Lulu Acro', width: 1600, height: 1200 },
];

/** The four poses of the story, Bird with its 3 photos and two transitions, Throne with 1 photo. */
const seedExamples = ({ catalogApi }: SimulatedSite, photoApi: PhotoApi) => {
  catalogApi.publish({ name: 'Bird', baseDifficulty: 'beginner', flyerDifficulty: 'beginner' });
  catalogApi.publish({ name: 'Folded Leaf', baseDifficulty: 'beginner', flyerDifficulty: 'discovery' });
  catalogApi.publish({ name: 'Reverse Bird', baseDifficulty: 'intermediate', flyerDifficulty: 'beginner' });
  catalogApi.publish({ name: 'Throne', baseDifficulty: 'beginner', flyerDifficulty: 'discovery' });
  const id = (name: string) => catalogApi.poseNamed(name).id;
  const transition = (from: string, to: string) =>
    catalogApi.publishTransition({
      fromPoseId: id(from),
      toPoseId: id(to),
      name: null,
      baseDifficulty: 'beginner',
      flyerDifficulty: 'beginner',
      description: null,
      tagIds: [],
    });
  transition('Bird', 'Folded Leaf');
  transition('Throne', 'Bird');
  for (const photo of birdPhotos) photoApi.add('Bird', photo);
  photoApi.add('Throne', {
    altText:
      'Throne : la base, allongée sur le dos, jambes à la verticale, tient les chevilles du flyer ; le flyer, assis sur ses pieds, genoux pliés ; vue de profil.',
    credit: 'Léa Martin',
    width: 1600,
    height: 1200,
  });
};

const openPose = async (page: Page, site: SimulatedSite, name: string) => {
  await page.goto(posePath(site.catalogApi.poseNamed(name).id));
  await expect(page.getByRole('heading', { level: 1, name, exact: true })).toBeVisible();
  await expect(page.locator('.pose-page--loaded')).toBeVisible();
  await imagesLoaded(page);
};

/** Every image of the page decoded, so that none is caught blank. */
const imagesLoaded = (page: Page) =>
  expect
    .poll(() =>
      page.evaluate(() => [...document.images].every((image) => image.complete && image.naturalWidth > 0)),
    )
    .toBe(true);

const scrollTo = async (page: Page, region: string) => {
  await page.getByRole('region', { name: region, exact: true }).scrollIntoViewIfNeeded();
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
};

test.describe('the catalog', () => {
  test('the thumbnail of Bird, no thumbnail for Throne without photo', async ({
    page,
    site,
    photoApi,
    shoot,
  }) => {
    seedExamples(site, photoApi);
    photoApi.removeElsewhere('Throne', photoApi.of('Throne')[0]!.altText);
    await new CatalogPage(page).open();
    await expect(page.locator('.pose-card img')).toHaveCount(1);
    await imagesLoaded(page);
    await shoot('catalog-thumbnails');
  });
});

test.describe('the page of a pose, for a visitor', () => {
  test('Bird with 3 photos: the top, then « Autres photos de Bird » at the bottom', async ({
    page,
    site,
    photoApi,
    shoot,
    shootView,
  }) => {
    seedExamples(site, photoApi);
    await openPose(page, site, 'Bird');
    await shoot('pose-visitor-3-photos');
    await shootView('pose-visitor-3-photos-top-view');
    await scrollTo(page, 'Autres photos de Bird');
    await shootView('pose-visitor-3-photos-bottom-view');
  });

  test('Throne with 1 photo', async ({ page, site, photoApi, shoot }) => {
    seedExamples(site, photoApi);
    await openPose(page, site, 'Throne');
    await shoot('pose-visitor-1-photo');
  });

  test('Folded Leaf without photo', async ({ page, site, photoApi, shoot }) => {
    seedExamples(site, photoApi);
    await openPose(page, site, 'Folded Leaf');
    await shoot('pose-visitor-no-photo');
  });

  test('the enlargement « Photo 2 sur 3 de Bird »', async ({ page, site, photoApi, shoot, shootView }) => {
    seedExamples(site, photoApi);
    await openPose(page, site, 'Bird');
    await page.getByRole('button', { name: 'Agrandir la photo : Bird vue de face', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Photo 2 sur 3 de Bird', exact: true });
    await expect(dialog).toBeVisible();
    await imagesLoaded(page);
    await shootView('enlargement-2-of-3-view');
    await shoot('enlargement-2-of-3');
  });
});

test.describe('the page of a pose, for a validator', () => {
  test('Bird with 3 photos: management, the main photo, the foot « 3 photos sur 5 »', async ({
    page,
    site,
    photoApi,
    shoot,
    shootView,
  }) => {
    seedExamples(site, photoApi);
    await signIn(page, site, bruno, 'validator');
    await openPose(page, site, 'Bird');
    await expect(page.getByText('3 photos sur 5', { exact: true })).toBeVisible();
    await shoot('pose-validator-3-photos');
    await shootView('pose-validator-3-photos-top-view');
    await scrollTo(page, 'Autres photos de Bird');
    await shootView('pose-validator-3-photos-bottom-view');
  });

  test('Bird with 5 photos: the maximum', async ({ page, site, photoApi, shoot, shootView }) => {
    seedExamples(site, photoApi);
    photoApi.add('Bird', { altText: 'Bird, la sortie', credit: 'Léa Martin', width: 1600, height: 1200 });
    photoApi.add('Bird', { altText: 'Bird vu de dos', credit: 'Hugo Bernard', width: 1600, height: 1200 });
    await signIn(page, site, bruno, 'validator');
    await openPose(page, site, 'Bird');
    await expect(
      page.getByText('Bird a déjà 5 photos, le maximum. Retire une photo pour en ajouter une autre.', {
        exact: true,
      }),
    ).toBeVisible();
    await shoot('pose-validator-5-photos');
    await scrollTo(page, 'Autres photos de Bird');
    await shootView('pose-validator-5-photos-bottom-view');
  });

  test('removing the main photo: the confirmation', async ({ page, site, photoApi, shoot, shootView }) => {
    seedExamples(site, photoApi);
    await signIn(page, site, bruno, 'validator');
    await openPose(page, site, 'Bird');
    await page.getByRole('button', { name: 'Retirer la photo : Bird vue de profil', exact: true }).click();
    const zone = page.getByRole('group', { name: 'Retirer cette photo de Bird ?', exact: true });
    await expect(zone).toBeVisible();
    await zone.scrollIntoViewIfNeeded();
    await shootView('remove-main-photo-confirm-view');
    await shoot('remove-main-photo-confirm');
  });

  test('the change in place of the alternative text and the credit', async ({
    page,
    site,
    photoApi,
    shoot,
    shootView,
  }) => {
    seedExamples(site, photoApi);
    await signIn(page, site, bruno, 'validator');
    await openPose(page, site, 'Bird');
    await page
      .getByRole('button', {
        name: 'Modifier le texte alternatif et le crédit : Bird vue de profil',
        exact: true,
      })
      .click();
    const zone = page.getByRole('group', { name: 'Texte alternatif et crédit', exact: true });
    await expect(zone).toBeVisible();
    await zone.scrollIntoViewIfNeeded();
    await shootView('edit-photo-in-place-view');
    await shoot('edit-photo-in-place');
  });

  test('Reverse Bird without photo: the invitation', async ({ page, site, photoApi, shoot }) => {
    seedExamples(site, photoApi);
    await signIn(page, site, bruno, 'validator');
    await openPose(page, site, 'Reverse Bird');
    await expect(
      page.getByRole('main').getByRole('link', { name: 'Ajouter une photo de Reverse Bird', exact: true }),
    ).toBeVisible();
    await shoot('pose-validator-no-photo-invitation');
  });
});

test.describe('the page « Ajouter une photo de Throne »', () => {
  /** Throne without photo, Bruno validator on the page « Ajouter une photo de Throne ». */
  const openAddPhoto = async (page: Page, site: SimulatedSite, photoApi: PhotoApi) => {
    seedExamples(site, photoApi);
    photoApi.removeElsewhere('Throne', photoApi.of('Throne')[0]!.altText);
    await signIn(page, site, bruno, 'validator');
    await openPose(page, site, 'Throne');
    await page
      .getByRole('main')
      .getByRole('link', { name: 'Ajouter une photo de Throne', exact: true })
      .click();
    const form = new AddPhotoForm(page);
    await expect(form.title('Throne')).toBeVisible();
    await expect(form.form).toBeVisible();
    return form;
  };

  test('empty', async ({ page, site, photoApi, shoot }) => {
    await openAddPhoto(page, site, photoApi);
    await shoot('add-photo-empty');
  });

  test('a photo chosen: preview and summary', async ({ page, site, photoApi, shoot }) => {
    const form = await openAddPhoto(page, site, photoApi);
    await form.choose(await fileNamed(page, 'une photo JPEG de 2 Mo de 1600×1200'));
    await form.fill({ altText: 'Throne vu de profil', credit: 'Léa Martin', rights: true });
    await imagesLoaded(page);
    await shoot('add-photo-chosen');
  });

  test('every error', async ({ page, site, photoApi, shoot }) => {
    const form = await openAddPhoto(page, site, photoApi);
    await form.submit();
    await expect(
      page.getByRole('main').getByText('Choisis une photo.', { exact: true }).first(),
    ).toBeVisible();
    await shoot('add-photo-all-errors');
  });

  test('a photo too small', async ({ page, site, photoApi, shoot }) => {
    const form = await openAddPhoto(page, site, photoApi);
    await form.fill({ altText: 'Throne vu de profil', credit: 'Léa Martin', rights: true });
    await form.choose(await fileNamed(page, 'une photo JPEG de 1 Mo de 1200×799'));
    await expect(form.fileError).toContainText('1200 × 799 pixels');
    await shoot('add-photo-too-small');
  });

  test('AcroFunJam unreachable', async ({ page, site, photoApi, shoot }) => {
    const form = await openAddPhoto(page, site, photoApi);
    await form.choose(await fileNamed(page, 'une photo JPEG de 2 Mo de 1600×1200'));
    await form.fill({ altText: 'Throne vu de profil', credit: 'Léa Martin', rights: true });
    setAcroFunJamReachable(site, false);
    await form.submit();
    await expect(
      page
        .getByRole('main')
        .getByText(
          "La photo n'a pas pu être envoyée : impossible de joindre AcroFunJam. Vérifie ta connexion Internet, puis réessaie.",
          { exact: true },
        )
        .first(),
    ).toBeVisible();
    await shoot('add-photo-unreachable');
  });

  test('the confirmation of abandonment', async ({ page, site, photoApi, shoot }) => {
    const form = await openAddPhoto(page, site, photoApi);
    await form.fill({ altText: 'Throne vu de profil' });
    await form.cancel();
    await expect(
      page.getByRole('group', { name: 'Abandonner cette photo ? Ta saisie sera perdue.', exact: true }),
    ).toBeVisible();
    await shoot('add-photo-abandon-confirm');
  });
});
