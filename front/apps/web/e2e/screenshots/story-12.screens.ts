import { expect, type Locator, type Page, type TestInfo } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { AddVideoForm } from '../pages/add-video-form';
import { posePath } from '../pages/pose-page';
import { VideoApi, type Preparation } from '../support/video-api';
import { videoNamed } from '../support/video-files';
import { signIn, test as base, type SimulatedSite } from './simulated-site';

// Story 12 « Vidéos des transitions » (docs/design/ecrans/12-videos-des-transitions.md): the videos of a transition on
// the page of a pose (visitor: posters, a launched video, a description; validator: preparation, failure, footer,
// modification, removal) and the page « Ajouter une vidéo à Pop to Bird » in its key states, at 320 px and 1280 px wide,
// light and dark themes. Output: screenshots/story-12/. `shootView` takes only what the window shows.

const bruno = 'bruno@example.org';

/** The simulated videos, started after the rest of the site so that their routes come first. */
const test = base.extend<{ videoApi: VideoApi; shootView: (screen: string) => Promise<void> }>({
  videoApi: async ({ context, site }, use) => {
    const api = new VideoApi(context, site.identityApi, site.catalogApi);
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

type Example = {
  caption: string;
  credit: string;
  description?: string;
  width: number;
  height: number;
  ms: number;
};

const popToBirdVideos: Example[] = [
  {
    caption: 'Pop to Bird, démonstration de face',
    credit: 'Léa Martin',
    width: 720,
    height: 1280,
    ms: 12_000,
  },
  {
    caption: 'Pop to Bird, tutoriel',
    credit: 'Hugo Bernard',
    description: "La base pousse les pieds du flyer, qui passe de l'assise à l'horizontale, face au sol.",
    width: 720,
    height: 1280,
    ms: 20_000,
  },
  { caption: 'Pop to Bird, vue de côté', credit: 'Collectif AcroLyon', width: 1280, height: 720, ms: 9_000 },
];

/** Throne, Bird and Star; Pop to Bird from Throne to Bird with its videos (the given preparations), Ninja Star on Star. */
const seedExamples = (
  { catalogApi }: SimulatedSite,
  videoApi: VideoApi,
  { count = 3, preparations = [] as Preparation[] } = {},
) => {
  catalogApi.publish({ name: 'Bird', baseDifficulty: 'beginner', flyerDifficulty: 'beginner' });
  catalogApi.publish({ name: 'Star', baseDifficulty: 'advanced', flyerDifficulty: 'advanced' });
  catalogApi.publish({ name: 'Throne', baseDifficulty: 'beginner', flyerDifficulty: 'discovery' });
  const id = (name: string) => catalogApi.poseNamed(name).id;
  const popToBird = catalogApi.publishTransition({
    fromPoseId: id('Throne'),
    toPoseId: id('Bird'),
    name: 'Pop to Bird',
    baseDifficulty: 'intermediate',
    flyerDifficulty: 'intermediate',
    description: 'Depuis Throne, la base pousse les pieds du flyer, qui bascule vers l’avant jusqu’en Bird.',
    tagIds: [],
  });
  catalogApi.publishTransition({
    fromPoseId: id('Throne'),
    toPoseId: id('Star'),
    name: null,
    baseDifficulty: 'advanced',
    flyerDifficulty: 'advanced',
    description: null,
    tagIds: [],
  });
  popToBirdVideos.slice(0, count).forEach((video, i) =>
    videoApi.add(popToBird.id, {
      caption: video.caption,
      credit: video.credit,
      description: video.description ?? null,
      width: video.width,
      height: video.height,
      durationMs: video.ms,
      preparation: preparations[i] ?? 'ready',
    }),
  );
};

const posterLoaded = (page: Page) =>
  expect
    .poll(() =>
      page.evaluate(() => [...document.images].every((image) => image.complete && image.naturalWidth > 0)),
    )
    .toBe(true);

const openThrone = async (page: Page, site: SimulatedSite) => {
  await page.goto(posePath(site.catalogApi.poseNamed('Throne').id));
  await expect(page.locator('.pose-page--loaded')).toBeVisible();
  await posterLoaded(page);
};

const popToBird = (page: Page): Locator =>
  page
    .getByRole('main')
    .getByRole('listitem')
    .filter({ has: page.getByRole('heading', { level: 3, name: 'Pop to Bird', exact: true }) })
    .first();

const scrollTo = (locator: Locator) =>
  locator.evaluate((element) => element.scrollIntoView({ block: 'start' }));

test.describe('the page of a pose, for a visitor', () => {
  test('Pop to Bird with 3 videos: the reminder, the row of posters', async ({
    page,
    site,
    videoApi,
    shoot,
    shootView,
  }) => {
    seedExamples(site, videoApi);
    await openThrone(page, site);
    await shoot('pose-visitor-3-videos');
    await scrollTo(popToBird(page).getByRole('group', { name: /^Vidéos/ }));
    await shootView('pose-visitor-3-videos-view');
  });

  test('Pop to Bird with 1 video', async ({ page, site, videoApi, shoot }) => {
    seedExamples(site, videoApi, { count: 1 });
    await openThrone(page, site);
    await shoot('pose-visitor-1-video');
  });

  test('a video launched at its place, its description open', async ({
    page,
    site,
    videoApi,
    shoot,
    shootView,
  }) => {
    seedExamples(site, videoApi);
    await openThrone(page, site);
    const item = popToBird(page);
    await item.getByRole('button', { name: /^Lire Pop to Bird, tutoriel/ }).click();
    const video = item.locator('video');
    await expect.poll(() => video.evaluate((v) => (v as HTMLVideoElement).readyState)).toBeGreaterThan(1);
    await video.evaluate((v) => (v as HTMLVideoElement).pause());
    await item.locator('summary', { hasText: 'Description' }).click();
    await scrollTo(video);
    await shootView('video-launched-view');
    await shoot('video-launched');
  });

  test('a launched video that could not be played', async ({ page, site, videoApi, shootView }) => {
    seedExamples(site, videoApi);
    await openThrone(page, site);
    // The network fails when the video is read (the poster is already shown).
    await page.route('**/catalog/videos/*/video', (route) => route.abort('connectionrefused'));
    const item = popToBird(page);
    await item.getByRole('button', { name: /^Lire Pop to Bird, tutoriel/ }).click();
    const failure = item.getByText("La vidéo n'a pas pu être lue", { exact: false });
    await expect(failure).toBeVisible();
    await scrollTo(item.locator('.video--active'));
    await shootView('video-playback-failed');
  });
});

test.describe('the page of a pose, for a validator', () => {
  test('2 videos, one in preparation: the footer « 2 vidéos sur 3 »', async ({
    page,
    site,
    videoApi,
    shoot,
    shootView,
  }) => {
    seedExamples(site, videoApi, { count: 2, preparations: ['ready', 'in-preparation'] });
    await signIn(page, site, bruno, 'validator');
    await openThrone(page, site);
    await expect(page.getByText('2 vidéos sur 3', { exact: true })).toBeVisible();
    await shoot('pose-validator-in-preparation');
    await scrollTo(popToBird(page).getByRole('group', { name: /^Vidéos/ }));
    await shootView('pose-validator-in-preparation-view');
  });

  test('a video that could not be prepared', async ({ page, site, videoApi, shootView, shoot }) => {
    seedExamples(site, videoApi, { count: 2, preparations: ['ready', 'failed'] });
    await signIn(page, site, bruno, 'validator');
    await openThrone(page, site);
    await scrollTo(popToBird(page).getByRole('group', { name: /^Vidéos/ }));
    await shootView('pose-validator-failed-view');
    await shoot('pose-validator-failed');
  });

  test('3 videos: the maximum', async ({ page, site, videoApi, shoot }) => {
    seedExamples(site, videoApi);
    await signIn(page, site, bruno, 'validator');
    await openThrone(page, site);
    await expect(page.getByText(/a déjà 3 vidéos, le maximum/)).toBeVisible();
    await shoot('pose-validator-3-videos');
  });

  test('modifying a video in place', async ({ page, site, videoApi, shootView }) => {
    seedExamples(site, videoApi);
    await signIn(page, site, bruno, 'validator');
    await openThrone(page, site);
    await popToBird(page)
      .getByRole('button', { name: 'Modifier Pop to Bird, tutoriel', exact: true })
      .click();
    const zone = page.getByRole('group', { name: 'Modifier la vidéo', exact: true });
    await expect(zone).toBeVisible();
    await scrollTo(zone);
    await shootView('modify-video-view');
  });

  test('removing the last video: the confirmation', async ({ page, site, videoApi, shootView }) => {
    seedExamples(site, videoApi, { count: 1 });
    await signIn(page, site, bruno, 'validator');
    await openThrone(page, site);
    await popToBird(page)
      .getByRole('button', { name: 'Retirer Pop to Bird, démonstration de face', exact: true })
      .click();
    const zone = page.getByRole('group', { name: 'Retirer cette vidéo de Pop to Bird ?', exact: true });
    await expect(zone).toBeVisible();
    await scrollTo(zone);
    await shootView('remove-last-video-view');
  });
});

test.describe('the page « Ajouter une vidéo à Pop to Bird »', () => {
  const openAddPage = async (page: Page, site: SimulatedSite) => {
    await signIn(page, site, bruno, 'validator');
    await openThrone(page, site);
    await page.getByRole('link', { name: 'Ajouter une vidéo à Pop to Bird', exact: true }).click();
    const form = new AddVideoForm(page);
    await expect(form.title('Pop to Bird')).toBeVisible();
    return form;
  };

  test('at rest', async ({ page, site, videoApi, shoot }) => {
    seedExamples(site, videoApi, { count: 0 });
    await openAddPage(page, site);
    await shoot('add-video-rest');
  });

  test('a HEVC video the browser cannot play, filled in', async ({ page, site, videoApi, shoot }) => {
    seedExamples(site, videoApi, { count: 0 });
    const form = await openAddPage(page, site);
    await form.choose(await videoNamed(page, 'une vidéo MOV HEVC de 12 s filmée par un iPhone'));
    await form.fill({ caption: 'Pop to Bird, vue de côté', credit: 'Léa Martin', rights: true });
    await shoot('add-video-hevc-filled');
  });

  test('a video too long, refused as soon as it is chosen', async ({ page, site, videoApi, shoot }) => {
    seedExamples(site, videoApi, { count: 0 });
    const form = await openAddPage(page, site);
    await form.choose(await videoNamed(page, 'une vidéo MP4 de 31,7 s'));
    await expect(form.fileError).toBeVisible();
    await shoot('add-video-too-long');
  });

  test('the checks of the sending', async ({ page, site, videoApi, shootView }) => {
    seedExamples(site, videoApi, { count: 0 });
    const form = await openAddPage(page, site);
    await form.choose(await videoNamed(page, 'une vidéo MP4 de 12 s'));
    await form.fill({ caption: 'Pop to Bird, vue de côté', credit: 'Léa Martin', rights: true });
    videoApi.holdAdditions();
    await form.submit();
    const checking = page.locator('.progress').getByText('Vérification de la vidéo…', { exact: true });
    await expect(checking).toBeVisible();
    // The indeterminate bar moves (the screenshot freezes it, animations disabled).
    const bar = page.locator('.progress progress');
    const at = () => bar.evaluate((element) => getComputedStyle(element).backgroundPosition);
    const start = await at();
    await expect.poll(at).not.toBe(start);
    await checking.scrollIntoViewIfNeeded();
    await shootView('add-video-checking-view');
    videoApi.releaseAdditions();
  });

  test('back on the transition after the addition', async ({ page, site, videoApi, shootView }) => {
    seedExamples(site, videoApi, { count: 1 });
    const form = await openAddPage(page, site);
    await form.choose(await videoNamed(page, 'une vidéo MP4 de 12 s'));
    await form.fill({ caption: 'Pop to Bird, vue de côté', credit: 'Léa Martin', rights: true });
    await form.submit();
    await expect(page.getByText('En préparation', { exact: true })).toBeVisible();
    await posterLoaded(page);
    await shootView('after-addition-view');
  });
});
