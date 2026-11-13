import { expect } from '@playwright/test';
import { Given, Then } from '../fixtures';
import { setAcroFunJamReachable } from '../support/reachability';

// Steps shared by every feature of the site.

Given('AcroFunJam est momentanément injoignable', async ({ identityApi, catalogApi, contributionApi }) =>
  setAcroFunJamReachable({ identityApi, catalogApi, contributionApi }, false),
);

Given('AcroFunJam est de nouveau joignable', async ({ identityApi, catalogApi, contributionApi }) =>
  setAcroFunJamReachable({ identityApi, catalogApi, contributionApi }, true),
);

const escaped = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// The quoted sentences, whole: a message may only go on with complete sentences (an advice after a refusal).
Then('le site indique « {} »', async ({ page }, text: string) => {
  // The same sentence may also be announced in the status region of the site: the one shown comes first.
  await expect(page.getByText(new RegExp(`^${escaped(text)}(?:\\s+[^\\s].*[.!?])?$`)).first()).toBeVisible();
});
