import { expect, type Locator, type Page } from '@playwright/test';
import type { DataTable } from 'playwright-bdd';
import { Given, Then, When } from '../fixtures';
import type { AddVideoForm } from '../pages/add-video-form';
import { posePath } from '../pages/pose-page';
import type { CatalogApi } from '../support/catalog-api';
import { beforeTheIncidents, type SimulatedApis } from '../support/reachability';
import {
  durationNamed,
  presentedDimensionsNamed,
  type Preparation,
  type VideoApi,
} from '../support/video-api';
import { videoNamed } from '../support/video-files';

// Story 12 « Vidéos des transitions »: scenarios @web of catalogue/consulter-les-videos-des-transitions.feature and
// catalogue/ajouter-des-videos-a-une-transition.feature.

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * A whole text as the site shows it, written in the scenario with plain spaces and hyphens: the texts of the videos
 * set no-break spaces (before « : », inside « ») and non-breaking hyphens (« choisis‑la »).
 */
const asShown = (text: string) =>
  new RegExp(`^${escapeRegExp(text).replace(/ /g, '\\s').replace(/-/g, '[-\\u2011]')}$`);

/** The element of a transition on the page of a pose, by the accessible name of its title (the first section first). */
const transitionItem = (page: Page, title: string) =>
  page
    .getByRole('main')
    .getByRole('listitem')
    .filter({ has: page.getByRole('heading', { level: 3, name: title, exact: true }) })
    .first();

/** A video of the page (its cell in the row of its transition), by its caption. */
const videoItem = (scope: Page | Locator, caption: string) => {
  const page = 'goto' in scope ? scope : scope.page();
  return scope.locator('li.video').filter({ has: page.getByText(caption, { exact: true }) });
};

/** The button « Lire » of a video: its accessible name starts with « Lire » and the caption. */
const playButton = (scope: Page | Locator, caption: string) =>
  scope.getByRole('button', { name: new RegExp(`^Lire ${escapeRegExp(caption)}( \\(|$)`) });

const openPose = async (page: Page, catalogApi: CatalogApi, name: string) => {
  await page.goto(posePath(catalogApi.poseNamed(name).id));
  await expect(page.getByRole('heading', { level: 1, name, exact: true })).toBeVisible();
};

/** The state of the player of a video: whether it plays, loops, is muted. */
const playerState = (item: Locator) =>
  item.locator('video').evaluateAll((videos) =>
    videos.map((video) => {
      const player = video as HTMLVideoElement;
      return { playing: !player.paused && player.currentTime > 0, loop: player.loop, muted: player.muted };
    }),
  );

const launch = async (page: Page, caption: string) => {
  await playButton(page, caption).click();
  await expect.poll(async () => (await playerState(videoItem(page, caption)))[0]?.playing).toBe(true);
};

// --- The videos of the scenario ---------------------------------------------------------------------------------

Given(
  /^la transition "([^"]+)" de "([^"]+)" vers "([^"]+)" a pour vidéos, dans cet ordre :$/,
  async ({ videoApi }, name: string, from: string, to: string, rows: DataTable) => {
    const transitionId = videoApi.transitionNamed(name, from, to);
    for (const row of rows.hashes())
      videoApi.add(transitionId, {
        caption: row['légende']!,
        credit: row['crédit']!,
        description: row['description'] || null,
        durationMs: durationNamed(row['fichier']!),
        ...presentedDimensionsNamed(row['fichier']!),
        preparation: 'ready',
      });
  },
);

// --- Consulting the videos --------------------------------------------------------------------------------------

Then(
  /^la transition « ([^»]+) » présente la vidéo « ([^»]+) », créditée « ([^»]+) »$/,
  async ({ page }, transition: string, caption: string, credit: string) => {
    const video = videoItem(transitionItem(page, transition), caption);
    await expect(video).toHaveCount(1);
    await expect(video.getByText(credit, { exact: true })).toBeVisible();
    await expect(playButton(video, caption)).toBeVisible();
  },
);

Then(/^« la transition (.+) » ne présente aucune vidéo$/, async ({ page }, title: string) => {
  const transition = transitionItem(page, title);
  await expect(transition).toBeVisible();
  await expect(transition.locator('li.video')).toHaveCount(0);
  await expect(transition.getByRole('heading', { name: /^Vidéos/ })).toHaveCount(0);
});

Then(
  /^la vidéo « ([^»]+) » présente, dans un repli « ([^»]+) », « ([^»]+) »$/,
  async ({ page }, caption: string, summary: string, description: string) => {
    const fold = videoItem(page, caption).getByRole('group').filter({ hasText: summary });
    // « Description », completed for the assistive technologies by « de la vidéo Pop to Bird, tutoriel ».
    await expect(fold.locator('summary')).toHaveText(`${summary} de la vidéo ${caption}`);
    await expect(fold).toContainText(description);
  },
);

Then(
  /^le lecteur de la vidéo « ([^»]+) » est décrit par cette description$/,
  async ({ page }, caption: string) => {
    const video = videoItem(page, caption);
    const description = (await video.locator('details p').textContent()) ?? '';
    await expect(playButton(video, caption)).toHaveAccessibleDescription(description);
  },
);

Then(
  /^la vidéo « ([^»]+) » ne présente pas de repli « ([^»]+) »$/,
  async ({ page }, caption: string, summary: string) => {
    const video = videoItem(page, caption);
    await expect(video).toHaveCount(1);
    await expect(video.locator('summary', { hasText: summary })).toHaveCount(0);
  },
);

Then(/^la vidéo « ([^»]+) » présente son affiche, sans être lue$/, async ({ page }, caption: string) => {
  const video = videoItem(page, caption);
  const poster = video.locator('img');
  await expect(poster).toBeVisible();
  await expect
    .poll(() => poster.evaluate((image) => (image as HTMLImageElement).naturalWidth))
    .toBeGreaterThan(0);
  await expect(video.locator('video')).toHaveCount(0);
});

Then("la page de la pose n'a téléchargé que les affiches des vidéos", async ({ page, videoApi }) => {
  // The posters of the first transition of the page are loaded with it.
  await expect(page.locator('li.video img').first()).toBeVisible();
  await expect
    .poll(() => videoApi.served.filter((served) => served.file === 'poster').length)
    .toBeGreaterThan(0);
  await page.waitForLoadState('networkidle');
  expect(videoApi.served.filter((served) => served.file !== 'poster')).toEqual([]);
});

When(/^le visiteur lance la vidéo « ([^»]+) »$/, async ({ page }, caption: string) => {
  await playButton(page, caption).click();
});

Given(
  /^un visiteur a lancé la vidéo « ([^»]+) » sur la page de la pose "([^"]+)"$/,
  async ({ page, catalogApi }, caption: string, pose: string) => {
    await openPose(page, catalogApi, pose);
    await launch(page, caption);
  },
);

Given(
  /^un visiteur qui préfère réduire les animations consulte la pose "([^"]+)" du catalogue$/,
  async ({ page, catalogApi }, pose: string) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openPose(page, catalogApi, pose);
  },
);

When(/^le visiteur met en pause la vidéo « ([^»]+) »$/, async ({ page }, caption: string) => {
  // The pause of the controls of the browser.
  await videoItem(page, caption)
    .locator('video')
    .evaluate((video) => (video as HTMLVideoElement).pause());
});

Then(/^la vidéo « ([^»]+) » se lit en boucle, sans son$/, async ({ page }, caption: string) => {
  await expect
    .poll(() => playerState(videoItem(page, caption)))
    .toEqual([{ playing: true, loop: true, muted: true }]);
});

Then(/^la vidéo « ([^»]+) » se lit une seule fois, sans boucle$/, async ({ page }, caption: string) => {
  await expect
    .poll(() => playerState(videoItem(page, caption)))
    .toEqual([{ playing: true, loop: false, muted: true }]);
});

Then(/^la vidéo « ([^»]+) » n'est plus lue$/, async ({ page }, caption: string) => {
  // Paused, or back to its poster.
  await expect
    .poll(async () => (await playerState(videoItem(page, caption))).some((state) => state.playing))
    .toBe(false);
  await expect(videoItem(page, caption)).toHaveCount(1);
});

Then(
  /^la transition « ([^»]+) » rappelle, avant ses vidéos, « ([^»]+) »$/,
  async ({ page }, transition: string, reminder: string) => {
    const item = transitionItem(page, transition);
    const sentence = item.getByText(reminder, { exact: true });
    await expect(sentence).toBeVisible();
    const before = await sentence.evaluate(
      (element) =>
        !!element.closest('li')?.querySelector('li.video') &&
        !!(
          element.compareDocumentPosition(element.closest('li')!.querySelector('li.video')!) &
          Node.DOCUMENT_POSITION_FOLLOWING
        ),
    );
    expect(before).toBe(true);
  },
);

// --- Managing the videos (validators and administrators) ---------------------------------------------------------

/** A video added before the scenario (by a validator), with what the scenario states. */
const addStored = (
  videoApi: VideoApi,
  transitionId: string,
  file: string,
  caption: string,
  credit = 'Léa Martin',
  preparation: Preparation = 'ready',
) =>
  videoApi.add(transitionId, {
    caption,
    credit,
    description: null,
    durationMs: durationNamed(file),
    ...presentedDimensionsNamed(file),
    preparation,
  });

Given(
  /^la transition "([^"]+)" de "([^"]+)" vers "([^"]+)" a déjà (\d+) vidéos?$/,
  async ({ videoApi }, name: string, from: string, to: string, count: string) => {
    const transitionId = videoApi.transitionNamed(name, from, to);
    for (let i = 1; i <= Number(count); i++)
      addStored(videoApi, transitionId, 'une vidéo MP4 de 12 s', `${name}, vidéo ${i}`);
  },
);

Given(
  /^(\S+) a ajouté à la transition "([^"]+)" de "([^"]+)" vers "([^"]+)" (une vidéo [^,]+?)( endommagée)?, avec la légende « ([^»]+) »(?: et le crédit « ([^»]+) »)?(, encore en préparation)?$/,
  async (
    { videoApi },
    _who: string,
    name: string,
    from: string,
    to: string,
    file: string,
    damaged: string | undefined,
    caption: string,
    credit: string | undefined,
    preparing: string | undefined,
  ) => {
    const transitionId = videoApi.transitionNamed(name, from, to);
    addStored(
      videoApi,
      transitionId,
      file,
      caption,
      // An optional group not matched is null, not undefined.
      credit ?? undefined,
      damaged || preparing ? 'in-preparation' : 'ready',
    );
  },
);

Given(/^AcroFunJam a fini de préparer la vidéo « ([^»]+) »$/, async ({ videoApi }, caption: string) =>
  videoApi.prepare(caption, 'ready'),
);

When(/^AcroFunJam finit de préparer la vidéo « ([^»]+) »$/, async ({ page, videoApi }, caption: string) => {
  // The page is consulted: a mark tells whether it is reloaded afterwards.
  await expect(page.locator('.pose-page--loaded')).toBeVisible();
  await page.evaluate(() => Object.assign(window, { notReloaded: true }));
  videoApi.prepare(caption, 'ready');
});

Given(/^AcroFunJam n'a pas pu préparer la vidéo « ([^»]+) »$/, async ({ videoApi }, caption: string) =>
  videoApi.prepare(caption, 'failed'),
);

// --- The invitation ------------------------------------------------------------------------------------------------

Then(
  /^la page de la pose n'invite pas (\S+) à ajouter une vidéo à (.+)$/,
  async ({ page }, _who: string, transition: string) => {
    // The session is known once the invitation to propose a modification appears.
    await expect(
      page.getByRole('main').getByRole('link', { name: 'Proposer une modification' }),
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: `Ajouter une vidéo à ${transition}`, exact: true }),
    ).toHaveCount(0);
  },
);

Then(
  /^la page de la pose indique, pour la transition « ([^»]+) », « (.+) »$/,
  async ({ page }, transition: string, text: string) => {
    await expect(transitionItem(page, transition).getByText(asShown(text))).toBeVisible();
  },
);

// --- The page « Ajouter une vidéo » --------------------------------------------------------------------------------

/**
 * The page « Ajouter une vidéo à Pop to Bird », opened from the transition on the page of the pose (in the given section
 * for a washing machine), as it was before the incidents of the scenario (outage, expired session).
 */
const openAddVideoPage = async (
  page: Page,
  apis: SimulatedApis,
  addVideoForm: AddVideoForm,
  pose: string,
  transition: string,
  direction: 'from' | 'to' = 'from',
): Promise<void> =>
  beforeTheIncidents(apis, async () => {
    await openPose(page, apis.catalogApi, pose);
    const section = page.getByRole('region', {
      name: `Transitions ${direction === 'from' ? 'depuis' : 'vers'} ${pose}`,
      exact: true,
    });
    await section
      .getByRole('link', { name: `Ajouter une vidéo à ${transition}`, exact: true })
      .first()
      .click();
    await expect(addVideoForm.title(transition)).toBeVisible();
    await expect(addVideoForm.form).toBeVisible();
  });

const videoFile = String.raw`une vidéo (?:MP4|MOV HEVC) de [\d,]+ s(?:, [\d,]+ Mo, \d+×\d+)?(?: filmée par un iPhone, que le navigateur ne sait pas lire)?`;

type Details = { caption: string; credit: string; description: string; rights: boolean; file: boolean };

/** « avec la légende « … » et le crédit « … » », « sans légende »…: what the scenario types, with neutral defaults. */
const detailsOf = (transition: string, details: string | undefined): Details => {
  const quoted = (label: string) => new RegExp(`${label} « ([^»]+) »`).exec(details ?? '')?.[1];
  return {
    caption: details === 'sans légende' ? '' : (quoted('la légende') ?? `${transition}, vue de côté`),
    credit: details === 'sans crédit' ? '' : (quoted('le crédit') ?? 'Léa Martin'),
    description: quoted('la description') ?? '',
    rights: details !== 'sans cocher la case des droits',
    file: details !== 'sans choisir de fichier',
  };
};

const fillVideo = async (page: Page, addVideoForm: AddVideoForm, file: string, details: Details) => {
  if (details.file) await addVideoForm.choose(await videoNamed(page, file));
  await addVideoForm.fill({
    caption: details.caption,
    credit: details.credit,
    description: details.description,
    rights: details.rights,
  });
};

const where = String.raw`depuis (?:la section des transitions (depuis|vers) )?la pose "([^"]+)"`;

When(
  new RegExp(
    String.raw`^(\S+) (ajoute|a ajouté|envoie) sur le site, ${where}, à la transition « ([^»]+) » (${videoFile})(?:, (.+))?$`,
  ),
  async (
    { page, identityApi, catalogApi, contributionApi, addVideoForm, videoApi },
    _who: string,
    verb: string,
    section: string | undefined,
    pose: string,
    transition: string,
    file: string,
    details: string | undefined,
  ) => {
    const direction = section === 'vers' ? 'to' : 'from';
    await openAddVideoPage(
      page,
      { identityApi, catalogApi, contributionApi },
      addVideoForm,
      pose,
      transition,
      direction,
    );
    await fillVideo(page, addVideoForm, file, detailsOf(transition, details));
    if (verb === 'envoie') videoApi.holdAdditions();
    await addVideoForm.submit();
    if (verb === 'a ajouté')
      await expect(page.getByRole('heading', { level: 1, name: pose, exact: true })).toBeVisible();
  },
);

Then(/^le site annonce « (.+) » jusqu'à la fin des contrôles$/, async ({ page, videoApi }, text: string) => {
  await expect(page.getByRole('main').getByText(text, { exact: true }).first()).toBeVisible();
  videoApi.releaseAdditions();
  await expect(page.getByRole('main').getByText(text, { exact: true })).toHaveCount(0);
});

When(
  new RegExp(
    String.raw`^(\S+) commence à ajouter sur le site une vidéo à la transition « ([^»]+) », ${where}(?:, avec la légende « ([^»]+) »)?$`,
  ),
  async (
    { page, identityApi, catalogApi, contributionApi, addVideoForm },
    _who: string,
    transition: string,
    section: string | undefined,
    pose: string,
    caption: string | undefined,
  ) => {
    const direction = section === 'vers' ? 'to' : 'from';
    await openAddVideoPage(
      page,
      { identityApi, catalogApi, contributionApi },
      addVideoForm,
      pose,
      transition,
      direction,
    );
    if (caption) await addVideoForm.fill({ caption });
  },
);

When(
  new RegExp(
    String.raw`^(\S+) choisit sur le site, pour la transition « ([^»]+) », (.+?)(?:, avec la légende « ([^»]+) » et le crédit « ([^»]+) »)?$`,
  ),
  async (
    { page, identityApi, catalogApi, contributionApi, addVideoForm },
    _who: string,
    transition: string,
    file: string,
    caption: string | undefined,
    credit: string | undefined,
  ) => {
    const pose = catalogApi.poseWithId(
      catalogApi.transitions.find((t) => t.name === transition)!.fromPoseId,
    )!.name;
    await openAddVideoPage(
      page,
      { identityApi, catalogApi, contributionApi },
      addVideoForm,
      pose,
      transition,
    );
    if (caption) await addVideoForm.fill({ caption, credit: credit ?? '', rights: true });
    await addVideoForm.choose(await videoNamed(page, file));
  },
);

Then(/^le site signale, sous le champ de la vidéo, (.+)$/, async ({ addVideoForm }, message: string) => {
  const quoted = /^« (.+) »$/.exec(message);
  if (quoted) await expect(addVideoForm.fileError).toHaveText(asShown(quoted[1]!));
  else if (message === 'que la vidéo dépasse 100 Mo')
    await expect(addVideoForm.fileError).toContainText('100 Mo');
  else throw new Error(`Message inconnu : ${message}`);
});

Then(
  /^la légende « ([^»]+) », le crédit « ([^»]+) » et la case des droits sont conservés$/,
  async ({ addVideoForm }, caption: string, credit: string) => {
    expect(addVideoForm.input).toMatchObject({ caption, credit, rights: true });
    await addVideoForm.expectKept();
    await expect(addVideoForm.rights).toBeChecked();
  },
);

Then(/^la saisie de la vidéo de (.+) est conservée$/, async ({ addVideoForm }, _transition: string) =>
  addVideoForm.expectKept(),
);

Then(
  /^la vidéo choisie, la légende « ([^»]+) » et le crédit « ([^»]+) » sont conservés$/,
  async ({ addVideoForm }, caption: string, credit: string) => {
    expect(addVideoForm.input).toMatchObject({ caption, credit });
    expect(addVideoForm.input.file).not.toBeNull();
    await addVideoForm.expectKept();
  },
);

Then(
  /^la légende « ([^»]+) » et le crédit « ([^»]+) » sont conservés$/,
  async ({ addVideoForm }, caption: string, credit: string) => {
    expect(addVideoForm.input).toMatchObject({ caption, credit });
    await addVideoForm.expectKept({ file: false });
  },
);

Then(
  /^le site présente la page de la pose "([^"]+)", sur la transition « ([^»]+) », et annonce « (.+) »$/,
  async ({ page, catalogApi }, pose: string, transition: string, text: string) => {
    await expect(page.getByRole('heading', { level: 1, name: pose, exact: true })).toBeVisible();
    expect(new URL(page.url()).pathname).toBe(posePath(catalogApi.poseNamed(pose).id));
    await expect(transitionItem(page, transition)).toBeInViewport();
    await expect(page.getByRole('status').filter({ hasText: text })).not.toHaveCount(0);
  },
);

Then(
  /^la transition « ([^»]+) » présente la vidéo « ([^»]+) » avec la description « ([^»]+) »$/,
  async ({ page }, transition: string, caption: string, description: string) => {
    const video = videoItem(transitionItem(page, transition), caption);
    await expect(video.locator('details')).toContainText(description);
  },
);

// --- The preparation -------------------------------------------------------------------------------------------

Then(
  /^la transition « ([^»]+) » présente à (\S+) la vidéo « ([^»]+) » marquée « ([^»]+) »$/,
  async ({ page }, transition: string, _who: string, caption: string, mark: string) => {
    const video = videoItem(transitionItem(page, transition), caption);
    await expect(video.getByText(mark, { exact: true })).toBeVisible();
    await expect(playButton(video, caption)).toHaveCount(0);
  },
);

Then(
  /^la transition « ([^»]+) » présente à (\S+) la vidéo « ([^»]+) », sans le repère « ([^»]+) », sans qu'il recharge la page$/,
  async ({ page }, transition: string, _who: string, caption: string, mark: string) => {
    const video = videoItem(transitionItem(page, transition), caption);
    // Read again every 5 seconds while a video is being prepared (ADR 0041).
    await expect(playButton(video, caption)).toBeVisible({ timeout: 15_000 });
    await expect(video.getByText(mark, { exact: true })).toHaveCount(0);
    expect(await page.evaluate(() => (window as { notReloaded?: boolean }).notReloaded)).toBe(true);
  },
);

Then(
  /^la transition « ([^»]+) » signale à (\S+) « (.+) »$/,
  async ({ page }, transition: string, _who: string, text: string) => {
    await expect(transitionItem(page, transition).getByText(asShown(text))).toBeVisible();
  },
);

Then(
  /^la page de la pose propose à (\S+) de retirer la vidéo « ([^»]+) »$/,
  async ({ page }, _who: string, caption: string) => {
    await expect(page.getByRole('button', { name: `Retirer ${caption}`, exact: true }).first()).toBeVisible();
  },
);

// --- Modify, remove ----------------------------------------------------------------------------------------------

When(
  /^(\S+) modifie sur le site, depuis la pose "([^"]+)", la vidéo « ([^»]+) » de la transition « ([^»]+) » avec (.+)$/,
  async (
    { page, catalogApi },
    _who: string,
    pose: string,
    caption: string,
    transition: string,
    values: string,
  ) => {
    await openPose(page, catalogApi, pose);
    const item = transitionItem(page, transition);
    await item.getByRole('button', { name: `Modifier ${caption}`, exact: true }).click();
    const zone = item.getByRole('group', { name: 'Modifier la vidéo', exact: true });
    const quoted = (label: string) => new RegExp(`${label} « ([^»]+) »`).exec(values)?.[1];
    const newCaption = quoted('la légende');
    const credit = quoted('le crédit');
    const description = quoted('la description');
    if (newCaption !== undefined)
      await zone.getByRole('textbox', { name: 'Légende', exact: true }).fill(newCaption);
    if (credit !== undefined) await zone.getByRole('textbox', { name: 'Crédit', exact: true }).fill(credit);
    if (description !== undefined)
      await zone.getByRole('textbox', { name: /^Description de la vidéo/ }).fill(description);
    await zone.getByRole('button', { name: 'Enregistrer la vidéo', exact: true }).click();
    await expect(zone).toHaveCount(0);
  },
);

const startRemoving = async (
  page: Page,
  catalogApi: CatalogApi,
  pose: string,
  caption: string,
  transition: string,
) => {
  await openPose(page, catalogApi, pose);
  await transitionItem(page, transition)
    .getByRole('button', { name: `Retirer ${caption}`, exact: true })
    .click();
};

When(
  /^(\S+) commence à retirer sur le site, depuis la pose "([^"]+)", la vidéo « ([^»]+) » de la transition « ([^»]+) »$/,
  async ({ page, catalogApi }, _who: string, pose: string, caption: string, transition: string) =>
    startRemoving(page, catalogApi, pose, caption, transition),
);

When(
  /^(\S+) retire sur le site, depuis la pose "([^"]+)", la vidéo « ([^»]+) » de la transition « ([^»]+) », après confirmation$/,
  async ({ page, catalogApi }, _who: string, pose: string, caption: string, transition: string) => {
    await startRemoving(page, catalogApi, pose, caption, transition);
    await transitionItem(page, transition)
      .getByRole('button', { name: 'Retirer la vidéo', exact: true })
      .click();
  },
);

Then(/^la transition « ([^»]+) » ne présente aucune vidéo$/, async ({ page }, transition: string) => {
  const item = transitionItem(page, transition);
  await expect(item).toBeVisible();
  await expect(item.locator('li.video')).toHaveCount(0);
});

Then(
  /^les transitions (depuis|vers) la pose "([^"]+)" présentent la transition « ([^»]+) » avec la vidéo « ([^»]+) »$/,
  async ({ page }, direction: string, pose: string, transition: string, caption: string) => {
    const section = page.getByRole('region', { name: `Transitions ${direction} ${pose}`, exact: true });
    const item = section
      .getByRole('listitem')
      .filter({ has: page.getByRole('heading', { level: 3, name: transition, exact: true }) });
    await expect(playButton(videoItem(item, caption), caption)).toBeVisible();
  },
);
