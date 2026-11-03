import { fail } from '@acrofunjam/core';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { CurrentLocation, FakeAuthGateway, FakeSessionMemory, renderSite } from '../test/identity-harness';

const account = () => screen.getByRole('navigation', { name: 'Compte' });

describe('site header', () => {
  it('should offer to sign in or register, coming back to the current page, when the person is a visitor', async () => {
    renderSite('/?page=2');

    const signIn = await within(account()).findByRole('link', { name: 'Se connecter' });
    expect(signIn).toHaveAttribute('href', '/connexion?retour=%2F%3Fpage%3D2');
    expect(within(account()).getByRole('link', { name: "S'inscrire" })).toBeInTheDocument();
  });

  it('should show the address and offer to sign out when the person is signed in', async () => {
    const gateway = new FakeAuthGateway();
    gateway.account = { email: 'alice@example.org' };

    renderSite('/', { gateway });

    expect(await within(account()).findByText('alice@example.org')).toBeInTheDocument();
    expect(within(account()).getByRole('button', { name: 'Se déconnecter' })).toBeInTheDocument();
  });

  it('should become a visitor and announce it when the person signs out', async () => {
    const gateway = new FakeAuthGateway();
    gateway.account = { email: 'alice@example.org' };
    const memory = new FakeSessionMemory(true);
    renderSite('/', { gateway, memory });

    await userEvent.click(await within(account()).findByRole('button', { name: 'Se déconnecter' }));

    expect(await within(account()).findByRole('link', { name: 'Se connecter' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Déconnexion effectuée.');
    expect(memory.hadSession).toBe(false);
    await waitFor(() => expect(within(account()).getByRole('link', { name: 'Se connecter' })).toHaveFocus());
  });

  it('should give the page its title in the catalog', async () => {
    renderSite('/');

    expect(await screen.findByRole('heading', { level: 1, name: 'Catalogue des poses' })).toBeInTheDocument();
  });
});

describe('sign-in page', () => {
  it('should show the field errors without calling the API when the form is incomplete', async () => {
    const { gateway } = renderSite('/connexion');

    await userEvent.click(await screen.findByRole('button', { name: 'Se connecter' }));

    expect(screen.getByText('Saisis ton adresse e-mail.')).toBeInTheDocument();
    expect(screen.getByLabelText('Adresse e-mail')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Adresse e-mail')).toHaveFocus();
    expect(gateway.calls).toEqual([]);
  });

  it('should show the refusal in an alert when the credentials are wrong', async () => {
    const gateway = new FakeAuthGateway();
    gateway.signInAnswer = fail('invalid-credentials');
    renderSite('/connexion', { gateway });

    await userEvent.type(await screen.findByLabelText('Adresse e-mail'), 'alice@example.org');
    await userEvent.type(screen.getByLabelText('Mot de passe', { exact: true }), 'Star-2026-Bird');
    await userEvent.click(screen.getByRole('button', { name: 'Se connecter' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Adresse e-mail ou mot de passe incorrect. Vérifie-les et réessaie.',
    );
  });

  it('should keep the input and offer to retry when AcroFunJam cannot be reached', async () => {
    const gateway = new FakeAuthGateway();
    gateway.unreachable();
    renderSite('/connexion', { gateway });

    await userEvent.type(await screen.findByLabelText('Adresse e-mail'), 'alice@example.org');
    await userEvent.type(screen.getByLabelText('Mot de passe', { exact: true }), 'Throne-Bird-2026');
    await userEvent.click(screen.getByRole('button', { name: 'Se connecter' }));
    const alert = await screen.findByRole('alert');
    expect(screen.getByLabelText('Adresse e-mail')).toHaveValue('alice@example.org');

    gateway.signInAnswer = { ok: true, value: undefined };
    await userEvent.click(within(alert).getByRole('button', { name: 'Réessayer' }));

    expect(await within(account()).findByText('alice@example.org')).toBeInTheDocument();
  });

  it('should go back to the page of origin and announce it when the sign-in succeeds', async () => {
    renderSite('/connexion?retour=%2F%3Fpage%3D2', {}, <CurrentLocation />);

    await userEvent.type(await screen.findByLabelText('Adresse e-mail'), 'alice@example.org');
    await userEvent.type(screen.getByLabelText('Mot de passe', { exact: true }), 'Throne-Bird-2026');
    await userEvent.click(screen.getByRole('button', { name: 'Se connecter' }));

    await waitFor(() => expect(screen.getByLabelText('Adresse courante')).toHaveTextContent('/?page=2'));
    expect(screen.getByRole('status')).toHaveTextContent('Connexion réussie.');
  });

  it('should let the person show then hide the password, the button naming what it does', async () => {
    renderSite('/connexion');

    await userEvent.click(await screen.findByRole('button', { name: 'Afficher le mot de passe' }));
    expect(screen.getByLabelText('Mot de passe', { exact: true })).toHaveAttribute('type', 'text');

    await userEvent.click(screen.getByRole('button', { name: 'Masquer le mot de passe' }));
    expect(screen.getByLabelText('Mot de passe', { exact: true })).toHaveAttribute('type', 'password');
  });

  it('should move the focus to the page title when the person opens the sign-in page', async () => {
    renderSite('/');

    await userEvent.click(await within(account()).findByRole('link', { name: 'Se connecter' }));

    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 1, name: 'Se connecter' })).toHaveFocus(),
    );
  });

  it('should keep the original return path when switching between sign-in and registration', async () => {
    renderSite('/connexion?retour=%2F%3Fpage%3D2');

    expect(await within(account()).findByRole('link', { name: "S'inscrire" })).toHaveAttribute(
      'href',
      '/inscription?retour=%2F%3Fpage%3D2',
    );
  });

  it('should send a signed-in person back to the page of origin when opening the sign-in page', async () => {
    const gateway = new FakeAuthGateway();
    gateway.account = { email: 'alice@example.org' };

    renderSite('/connexion?retour=%2F%3Fpage%3D2', { gateway }, <CurrentLocation />);

    await waitFor(() => expect(screen.getByLabelText('Adresse courante')).toHaveTextContent('/?page=2'));
  });

  it('should offer to sign in when the account is created but the sign-in fails', async () => {
    const gateway = new FakeAuthGateway();
    gateway.unreachable();
    renderSite('/inscription', { gateway });

    await userEvent.type(await screen.findByLabelText('Adresse e-mail'), 'alice@example.org');
    await userEvent.type(screen.getByLabelText('Mot de passe', { exact: true }), 'une phrase de passe');
    await userEvent.click(screen.getByRole('button', { name: 'Créer mon compte' }));

    expect(
      within(await screen.findByRole('alert')).getByRole('link', { name: 'Se connecter' }),
    ).toBeInTheDocument();
  });
});

describe('registration page', () => {
  it('should state the password requirement before typing', async () => {
    renderSite('/inscription');

    expect(
      await screen.findByText('Ton mot de passe doit contenir au moins 10 caractères.'),
    ).toBeInTheDocument();
  });

  it('should refuse a password that is too short without calling the API', async () => {
    const { gateway } = renderSite('/inscription');

    await userEvent.type(await screen.findByLabelText('Adresse e-mail'), 'alice@example.org');
    await userEvent.type(screen.getByLabelText('Mot de passe', { exact: true }), 'Throne-26');
    await userEvent.click(screen.getByRole('button', { name: 'Créer mon compte' }));

    expect(
      screen.getByText('Ton mot de passe est trop court : il doit contenir au moins 10 caractères.'),
    ).toBeInTheDocument();
    expect(gateway.calls).toEqual([]);
  });

  it('should sign the person in when the account is created', async () => {
    const { gateway } = renderSite('/inscription');

    await userEvent.type(await screen.findByLabelText('Adresse e-mail'), 'alice@example.org');
    await userEvent.type(screen.getByLabelText('Mot de passe', { exact: true }), 'une phrase de passe');
    await userEvent.click(screen.getByRole('button', { name: 'Créer mon compte' }));

    expect(await within(account()).findByText('alice@example.org')).toBeInTheDocument();
    expect(gateway.calls).toEqual(['register', 'signIn']);
  });

  it('should show the refusal when the address is already used', async () => {
    const gateway = new FakeAuthGateway();
    gateway.registerAnswer = fail('email-already-used');
    renderSite('/inscription', { gateway });

    await userEvent.type(await screen.findByLabelText('Adresse e-mail'), 'alice@example.org');
    await userEvent.type(screen.getByLabelText('Mot de passe', { exact: true }), 'une phrase de passe');
    await userEvent.click(screen.getByRole('button', { name: 'Créer mon compte' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Cette adresse e-mail sert déjà à un compte.');
  });
});

describe('expired session', () => {
  it('should tell the person and offer to sign in again when the session expired', async () => {
    renderSite('/', { memory: new FakeSessionMemory(true) });

    const banner = await screen.findByRole('region', { name: 'Session expirée' });
    expect(banner).toHaveTextContent('Ta session a expiré.');
    expect(within(banner).getByRole('link', { name: 'Se connecter' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Ta session a expiré. Tu peux te reconnecter.');
  });

  it('should hide the banner when the person closes it', async () => {
    renderSite('/', { memory: new FakeSessionMemory(true) });

    await userEvent.click(
      within(await screen.findByRole('region', { name: 'Session expirée' })).getByRole('button', {
        name: 'Fermer',
      }),
    );

    expect(screen.queryByRole('region', { name: 'Session expirée' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Catalogue des poses' })).toHaveFocus();
  });
});
