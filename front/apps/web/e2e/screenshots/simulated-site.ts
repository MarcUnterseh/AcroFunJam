import { test as base, type Page, type TestInfo } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CatalogApi } from '../support/catalog-api';
import { ContributionApi } from '../support/contribution-api';
import { IdentityApi } from '../support/identity-api';
import { MyProposalsApi } from '../support/my-proposals-api';
import { defaultPassword, expectSignedIn, signInThroughTheSite } from '../support/people';
import { PoseRevisionApi } from '../support/pose-revision-api';
import { TagApi } from '../support/tag-api';
import { TransitionApi } from '../support/transition-api';
import { ValidationApi } from '../support/validation-api';

/** The simulated APIs of the e2e (ADR 0006), all started: a screen may call any of them. */
export type SimulatedSite = {
  identityApi: IdentityApi;
  catalogApi: CatalogApi;
  contributionApi: ContributionApi;
  validationApi: ValidationApi;
  myProposalsApi: MyProposalsApi;
  poseRevisionApi: PoseRevisionApi;
  transitionApi: TransitionApi;
  tagApi: TagApi;
};

/**
 * The test of the screenshots: the page, with the simulated site, and `shoot`, which takes the whole page as
 * screenshots/<story>/<screen>-<width>.png (the width is the name of the project).
 */
export const test = base.extend<{
  site: SimulatedSite;
  shoot: (screen: string) => Promise<void>;
}>({
  site: async ({ context }, use) => {
    const identityApi = new IdentityApi(context);
    const catalogApi = new CatalogApi(context);
    const contributionApi = new ContributionApi(context, identityApi, catalogApi);
    const site: SimulatedSite = {
      identityApi,
      catalogApi,
      contributionApi,
      validationApi: new ValidationApi(context, identityApi, catalogApi, contributionApi),
      myProposalsApi: new MyProposalsApi(context, identityApi, contributionApi, catalogApi),
      poseRevisionApi: new PoseRevisionApi(context, identityApi, catalogApi, contributionApi),
      transitionApi: new TransitionApi(context, identityApi, catalogApi, contributionApi),
      tagApi: new TagApi(context, identityApi, catalogApi),
    };
    for (const api of Object.values(site)) await api.start();
    await use(site);
  },
  shoot: async ({ page }, use, testInfo) => {
    await use((screen) => shootPage(page, testInfo, screen));
  },
});

const screenshotsRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../screenshots');

/** The story of a screens file: « story-7 » for story-7.screens.ts. */
const storyOf = (testInfo: TestInfo) => path.basename(testInfo.file).replace(/\.screens\.ts$/, '');

const shootPage = async (page: Page, testInfo: TestInfo, screen: string) => {
  await page.screenshot({
    path: path.join(screenshotsRoot, storyOf(testInfo), `${screen}-${testInfo.project.name}.png`),
    fullPage: true,
    // No caret, no animation caught halfway: the image shows the settled screen.
    caret: 'hide',
    animations: 'disabled',
  });
};

/** A person of the screens, signed in through the site with the given role. */
export const signIn = async (
  page: Page,
  { identityApi }: SimulatedSite,
  email: string,
  role: 'user' | 'validator' | 'administrator' = 'user',
) => {
  identityApi.addAccount(email, defaultPassword, role);
  await signInThroughTheSite(page, email, defaultPassword);
  await expectSignedIn(page, email);
};
