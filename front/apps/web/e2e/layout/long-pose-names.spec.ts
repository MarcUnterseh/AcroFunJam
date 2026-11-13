import { expect, test, type Page } from '@playwright/test';
import { posePath } from '../pages/pose-page';
import { TransitionForm, transitionPath } from '../pages/transition-form';
import { CatalogApi } from '../support/catalog-api';
import { ContributionApi } from '../support/contribution-api';
import { IdentityApi } from '../support/identity-api';
import { defaultPassword, expectSignedIn, signInThroughTheSite } from '../support/people';
import { TransitionApi } from '../support/transition-api';

// Layout check outside the Gherkin specs (no business rule), story 7: a pose name of 60 characters (the maximum) in the
// labels of the actions (« Proposer une transition depuis … », « Proposer une autre transition depuis … », « Revenir
// à … ») wraps rather than overflows, at 320 px (WCAG 1.4.10) as on a wide screen (lien-bouton.md).

const longName = 'Chandelle inversée sur les mains du base avec vrille arrière';
const overflowOf = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

for (const width of [320, 1280]) {
  test.describe(`at ${width} px`, () => {
    test.use({ viewport: { width, height: 800 } });

    test('the page of a pose and the confirmation of a transition do not scroll horizontally with a name of 60 characters', async ({
      page,
      context,
    }) => {
      expect([...longName]).toHaveLength(60);
      const identityApi = new IdentityApi(context);
      const catalogApi = new CatalogApi(context);
      const contributionApi = new ContributionApi(context, identityApi, catalogApi);
      const transitionApi = new TransitionApi(context, identityApi, catalogApi, contributionApi);
      for (const api of [identityApi, catalogApi, contributionApi, transitionApi]) await api.start();
      catalogApi.publish({ name: longName });
      catalogApi.publish({ name: 'Bird' });
      const email = 'alice@example.org';
      identityApi.addAccount(email, defaultPassword);
      await page.goto('/');
      await signInThroughTheSite(page, email, defaultPassword);
      await expectSignedIn(page, email);

      const poseId = catalogApi.poseNamed(longName).id;
      await page.goto(posePath(poseId));
      await expect(
        page.getByRole('link', { name: `Proposer une transition depuis ${longName}` }),
      ).toBeVisible();
      expect(await overflowOf(page)).toBeLessThanOrEqual(0);

      await page.goto(transitionPath(poseId));
      const form = new TransitionForm(page);
      await form.loaded();
      await form.fill({ to: 'Bird' });
      await form.submit();
      await expect(page.getByRole('link', { name: `Revenir à ${longName}` })).toBeVisible();
      expect(await overflowOf(page)).toBeLessThanOrEqual(0);
    });
  });
}
