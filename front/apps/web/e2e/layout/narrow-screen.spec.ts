import { expect, test } from '@playwright/test';
import { ValidationPage } from '../pages/validation-page';
import { CatalogApi } from '../support/catalog-api';
import { ContributionApi } from '../support/contribution-api';
import { IdentityApi } from '../support/identity-api';
import { defaultPassword, expectSignedIn, signInThroughTheSite } from '../support/people';
import { ValidationApi } from '../support/validation-api';

// Layout check outside the Gherkin specs (no business rule): at 320 CSS px wide, as a 1280 px screen zoomed to
// 400 % (WCAG 1.4.10 « Redistribution »), the page « Propositions à valider » never scrolls horizontally.

const longName = 'Planche-renversée-sur-les-pieds-du-base-en-équilibre-total';
const longerName = 'Chandelle-inversée-sur-les-mains-du-base-avec-vrille-arrière';

test.use({ viewport: { width: 320, height: 640 } });

test('the page « Propositions à valider » does not scroll horizontally at 320 px', async ({
  page,
  context,
}) => {
  const identityApi = new IdentityApi(context);
  const catalogApi = new CatalogApi(context);
  const contributionApi = new ContributionApi(context, identityApi, catalogApi);
  const validationApi = new ValidationApi(context, identityApi, catalogApi, contributionApi);
  for (const api of [identityApi, catalogApi, contributionApi, validationApi]) await api.start();

  const email = 'bruno.validateur.avec.une.adresse.tres.longue@example.org';
  identityApi.addAccount(email, defaultPassword, 'validator');
  const pose = {
    baseDifficulty: 'beginner',
    flyerDifficulty: 'discovery',
    canStartFlow: true,
    canEndFlow: true,
  } as const;
  const contributorEmail = 'alice.contributrice.avec.une.adresse.tres.longue@example.org';
  contributionApi.addPending({ name: longName, contributorEmail, ...pose });
  contributionApi.addPending({ name: 'Throne', contributorEmail, ...pose });
  // More than 99 pending: the header shows « 99+ ».
  for (let n = 0; n < 98; n += 1)
    contributionApi.addPending({ name: `Pose ${n}`, contributorEmail, ...pose });

  await page.goto('/');
  await signInThroughTheSite(page, email, defaultPassword);
  await expectSignedIn(page, email);
  const validation = new ValidationPage(page);
  await validation.open();
  await expect(page.getByRole('navigation', { name: 'Contribution' }).getByText('99+')).toBeVisible();

  // One card open in the adjustment form, with the alert « rien modifié » and its button; another one at the
  // summary with a long retained name.
  const adjusting = validation.card(longName);
  await adjusting.getByRole('button', { name: 'Ajuster avant de publier' }).click();
  await adjusting.getByRole('button', { name: 'Vérifier les ajustements' }).click();
  await expect(
    adjusting.getByRole('alert').getByRole('button', { name: 'Accepter et publier' }),
  ).toBeVisible();
  await validation.adjust('Throne', { name: longerName });
  await expect(
    validation.card('Throne').getByRole('heading', { level: 3, name: 'Vérifie tes ajustements' }),
  ).toBeVisible();

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
