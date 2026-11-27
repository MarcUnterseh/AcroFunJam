import { expect, type Page } from '@playwright/test';
import { test } from './simulated-site';

/** The header has answered the session: its account links are drawn. */
const headerReady = (page: Page) =>
  expect(
    page.getByRole('navigation', { name: 'Compte' }).getByRole('link', { name: 'Se connecter' }),
  ).toBeVisible();

// Story « Mentions légales et confidentialité » (docs/design/ecrans/informations-legales.md): the footer on a short
// page, the two legal pages and the sentence of « S'inscrire », at 320 px and 1280 px wide. Output:
// screenshots/story-legal/.

test.describe('legal information', () => {
  test('the footer on a short page', async ({ page, shoot }) => {
    await page.goto('/une/page/inconnue');
    await expect(page.getByRole('heading', { level: 1, name: 'Page introuvable' })).toBeVisible();
    await headerReady(page);
    await shoot('footer-short-page');
  });

  test('the legal notice', async ({ page, shoot }) => {
    await page.goto('/mentions-legales');
    await expect(page.getByRole('heading', { level: 1, name: 'Mentions légales' })).toBeVisible();
    await headerReady(page);
    await shoot('legal-notice');
  });

  test('the privacy policy', async ({ page, shoot }) => {
    await page.goto('/confidentialite');
    await expect(page.getByRole('heading', { level: 1, name: 'Politique de confidentialité' })).toBeVisible();
    await headerReady(page);
    await shoot('privacy-policy');
  });

  test('the registration page, which leads to the privacy policy', async ({ page, shoot }) => {
    await page.goto('/inscription');
    await expect(page.getByRole('heading', { level: 1, name: "S'inscrire" })).toBeVisible();
    await headerReady(page);
    await shoot('registration');
  });
});
