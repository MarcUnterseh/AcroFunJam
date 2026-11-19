import type { Page } from '@playwright/test';
import { test as base, createBdd } from 'playwright-bdd';
import { CatalogPage } from './pages/catalog-page';
import { FlowGenerator } from './pages/flow-generator';
import { IdentityForm, SiteHeader } from './pages/identity-pages';
import { MyProposalsPage } from './pages/my-proposals-page';
import { PosePage } from './pages/pose-page';
import { ProposalForm } from './pages/proposal-form';
import { TagsPage } from './pages/tags-page';
import { RevisionForm } from './pages/revision-form';
import { TransitionForm } from './pages/transition-form';
import { ValidationPage } from './pages/validation-page';
import { CatalogApi } from './support/catalog-api';
import { FlowGenerationApi } from './support/flow-generation-api';
import { ContributionApi } from './support/contribution-api';
import { IdentityApi } from './support/identity-api';
import { MyProposalsApi } from './support/my-proposals-api';
import { PoseRevisionApi } from './support/pose-revision-api';
import { TagApi } from './support/tag-api';
import { TransitionApi } from './support/transition-api';
import { ValidationApi } from './support/validation-api';

type Fixtures = {
  catalogApi: CatalogApi;
  identityApi: IdentityApi;
  contributionApi: ContributionApi;
  validationApi: ValidationApi;
  myProposalsApi: MyProposalsApi;
  poseRevisionApi: PoseRevisionApi;
  transitionApi: TransitionApi;
  tagApi: TagApi;
  flowGenerationApi: FlowGenerationApi;
  flowGenerator: FlowGenerator;
  catalogPage: CatalogPage;
  posePage: PosePage;
  proposalForm: ProposalForm;
  revisionForm: RevisionForm;
  transitionForm: TransitionForm;
  validationPage: ValidationPage;
  myProposalsPage: MyProposalsPage;
  tagsPage: TagsPage;
  header: SiteHeader;
  signInForm: IdentityForm;
  registrationForm: IdentityForm;
  /** A second tab of the same browser (same cookies and storage). */
  otherTab: Page;
};

// Page objects and the simulated API are exposed as fixtures; steps never use selectors directly.
// The simulated APIs are installed for every scenario: any page of the site may call them.
export const test = base.extend<Fixtures>({
  catalogApi: [
    async ({ context }, use) => {
      const api = new CatalogApi(context);
      await api.start();
      await use(api);
    },
    { auto: true },
  ],
  identityApi: [
    async ({ context }, use) => {
      const api = new IdentityApi(context);
      await api.start();
      await use(api);
    },
    { auto: true },
  ],
  contributionApi: [
    async ({ context, identityApi, catalogApi }, use) => {
      const api = new ContributionApi(context, identityApi, catalogApi);
      await api.start();
      await use(api);
    },
    { auto: true },
  ],
  validationApi: [
    async ({ context, identityApi, catalogApi, contributionApi }, use) => {
      const api = new ValidationApi(context, identityApi, catalogApi, contributionApi);
      await api.start();
      await use(api);
    },
    { auto: true },
  ],
  myProposalsApi: [
    async ({ context, identityApi, contributionApi, catalogApi }, use) => {
      const api = new MyProposalsApi(context, identityApi, contributionApi, catalogApi);
      await api.start();
      await use(api);
    },
    { auto: true },
  ],
  poseRevisionApi: [
    async ({ context, identityApi, catalogApi, contributionApi }, use) => {
      const api = new PoseRevisionApi(context, identityApi, catalogApi, contributionApi);
      await api.start();
      await use(api);
    },
    { auto: true },
  ],
  transitionApi: [
    async ({ context, identityApi, catalogApi, contributionApi }, use) => {
      const api = new TransitionApi(context, identityApi, catalogApi, contributionApi);
      await api.start();
      await use(api);
    },
    { auto: true },
  ],
  tagApi: [
    async ({ context, identityApi, catalogApi }, use) => {
      const api = new TagApi(context, identityApi, catalogApi);
      await api.start();
      await use(api);
    },
    { auto: true },
  ],
  flowGenerationApi: [
    async ({ context, catalogApi, tagApi }, use) => {
      const api = new FlowGenerationApi(context, catalogApi);
      api.tagsOfTheList = () => tagApi.ids;
      await api.start();
      await use(api);
    },
    { auto: true },
  ],
  flowGenerator: async ({ page }, use) => use(new FlowGenerator(page)),
  catalogPage: async ({ page }, use) => use(new CatalogPage(page)),
  posePage: async ({ page }, use) => use(new PosePage(page)),
  proposalForm: async ({ page }, use) => use(new ProposalForm(page)),
  revisionForm: async ({ page }, use) => use(new RevisionForm(page)),
  transitionForm: async ({ page }, use) => use(new TransitionForm(page)),
  validationPage: async ({ page }, use) => use(new ValidationPage(page)),
  myProposalsPage: async ({ page }, use) => use(new MyProposalsPage(page)),
  tagsPage: async ({ page }, use) => use(new TagsPage(page)),
  header: async ({ page }, use) => use(new SiteHeader(page)),
  signInForm: async ({ page }, use) => use(new IdentityForm(page, 'Se connecter')),
  registrationForm: async ({ page }, use) => use(new IdentityForm(page, "S'inscrire")),
  otherTab: async ({ context }, use) => {
    const tab = await context.newPage();
    await use(tab);
    await tab.close();
  },
});

export const { Given, When, Then } = createBdd(test);
