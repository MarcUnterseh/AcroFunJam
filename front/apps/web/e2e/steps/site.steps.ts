import { expect } from '@playwright/test';
import { Given, Then } from '../fixtures';
import { setAcroFunJamReachable } from '../support/reachability';

// Steps shared by every feature of the site.

Given('AcroFunJam est momentanément injoignable', async ({ identityApi, catalogApi }) =>
  setAcroFunJamReachable({ identityApi, catalogApi }, false),
);

Given('AcroFunJam est de nouveau joignable', async ({ identityApi, catalogApi }) =>
  setAcroFunJamReachable({ identityApi, catalogApi }, true),
);

Then('le site indique « {} »', async ({ page }, text: string) => {
  await expect(page.getByText(text, { exact: true })).toBeVisible();
});
