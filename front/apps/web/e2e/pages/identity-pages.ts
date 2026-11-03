import type { Page } from '@playwright/test';

/** Header of every page: the "Compte" navigation, visitor or signed in. */
export class SiteHeader {
  constructor(private readonly page: Page) {}

  get account() {
    return this.page.getByRole('navigation', { name: 'Compte' });
  }

  async openSignIn(): Promise<void> {
    await this.account.getByRole('link', { name: 'Se connecter' }).click();
  }

  async openRegistration(): Promise<void> {
    await this.account.getByRole('link', { name: "S'inscrire" }).click();
  }

  async signOut(): Promise<void> {
    await this.account.getByRole('button', { name: 'Se déconnecter' }).click();
  }
}

/** "Se connecter" and "S'inscrire" forms: same fields, different submit buttons. */
export class IdentityForm {
  constructor(
    private readonly page: Page,
    private readonly name: 'Se connecter' | "S'inscrire",
  ) {}

  private get form() {
    return this.page.getByRole('form', { name: this.name });
  }

  get email() {
    return this.form.getByLabel('Adresse e-mail');
  }

  async fill(email: string, password: string): Promise<void> {
    await this.email.fill(email);
    await this.form.getByLabel('Mot de passe', { exact: true }).fill(password);
  }

  async submit(): Promise<void> {
    await this.form
      .getByRole('button', { name: this.name === 'Se connecter' ? 'Se connecter' : 'Créer mon compte' })
      .click();
  }

  async retry(): Promise<void> {
    await this.form.getByRole('button', { name: 'Réessayer' }).click();
  }
}
