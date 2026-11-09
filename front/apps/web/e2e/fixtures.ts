import type { Page } from '@playwright/test';
import { test as base, createBdd } from 'playwright-bdd';
import { CatalogPage } from './pages/catalog-page';
import { IdentityForm, SiteHeader } from './pages/identity-pages';
import { ProposalForm } from './pages/proposal-form';
import { ValidationPage } from './pages/validation-page';
import { CatalogApi } from './support/catalog-api';
import { ContributionApi } from './support/contribution-api';
import { IdentityApi } from './support/identity-api';
import { ValidationApi } from './support/validation-api';

type Fixtures = {
  catalogApi: CatalogApi;
  identityApi: IdentityApi;
  contributionApi: ContributionApi;
  validationApi: ValidationApi;
  catalogPage: CatalogPage;
  proposalForm: ProposalForm;
  validationPage: ValidationPage;
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
  catalogPage: async ({ page }, use) => use(new CatalogPage(page)),
  proposalForm: async ({ page }, use) => use(new ProposalForm(page)),
  validationPage: async ({ page }, use) => use(new ValidationPage(page)),
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
