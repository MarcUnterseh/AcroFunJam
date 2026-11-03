import { expect, type Page } from '@playwright/test';
import { IdentityForm, SiteHeader } from '../pages/identity-pages';

/** Password of the people of the scenarios when the scenario does not state one. */
export const defaultPassword = 'Throne-Bird-2026';

/** Signs in from the page being consulted (the home page if none), through the header link. */
export const signInThroughTheSite = async (page: Page, email: string, password: string) => {
  if (!page.url().startsWith('http')) await page.goto('/');
  await new SiteHeader(page).openSignIn();
  const form = new IdentityForm(page, 'Se connecter');
  await form.fill(email, password);
  await form.submit();
};

export const expectSignedIn = async (page: Page, email: string) => {
  await expect(new SiteHeader(page).account).toContainText(email);
  await expect(new SiteHeader(page).account.getByRole('button', { name: 'Se déconnecter' })).toBeVisible();
};
