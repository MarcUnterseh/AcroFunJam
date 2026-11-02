import { test as base, createBdd } from 'playwright-bdd';
import { CatalogPage } from './pages/catalog-page';
import { CatalogApi } from './support/catalog-api';

// Page objects and the simulated API are exposed as fixtures; steps never use selectors directly.
export const test = base.extend<{ catalogApi: CatalogApi; catalogPage: CatalogPage }>({
  catalogApi: async ({ page }, use) => {
    const api = new CatalogApi(page);
    await api.start();
    await use(api);
  },
  catalogPage: async ({ page }, use) => {
    await use(new CatalogPage(page));
  },
});

export const { Given, When, Then } = createBdd(test);
