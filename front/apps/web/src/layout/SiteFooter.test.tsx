import { fail } from '@acrofunjam/core';
import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FakeAuthGateway, renderSite } from '../test/site-harness';

const footer = async () => within(await screen.findByRole('contentinfo'));

describe('footer of the site', () => {
  it('should lead to the legal notice', async () => {
    renderSite('/');

    expect((await footer()).getByRole('link', { name: 'Mentions légales' })).toHaveAttribute(
      'href',
      '/mentions-legales',
    );
  });

  it('should lead to the privacy policy', async () => {
    renderSite('/');

    expect((await footer()).getByRole('link', { name: 'Politique de confidentialité' })).toHaveAttribute(
      'href',
      '/confidentialite',
    );
  });

  it('should write the contact address out, in a link that prepares a message to it', async () => {
    renderSite('/');

    const contact = (await footer()).getByRole('link', { name: 'contact@acrofunjam.fr (écrire un e-mail)' });
    expect(contact).toHaveAttribute('href', 'mailto:contact@acrofunjam.fr');
    expect(contact).toHaveTextContent(/^contact@acrofunjam\.fr/);
  });

  it('should name its navigation « Informations légales »', async () => {
    renderSite('/');

    expect((await footer()).getByRole('navigation', { name: 'Informations légales' })).toBeInTheDocument();
  });

  it('should mark the link of the current legal page', async () => {
    renderSite('/mentions-legales');

    expect((await footer()).getByRole('link', { name: 'Mentions légales' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect((await footer()).getByRole('link', { name: 'Politique de confidentialité' })).not.toHaveAttribute(
      'aria-current',
    );
  });

  it.each([
    ['/', 'the catalog'],
    ['/poses/inconnue', 'an unknown pose'],
    ['/generer-un-flow', 'the flow generator'],
    ['/etiquettes', 'the tags'],
    ['/connexion', 'the sign-in page'],
    ['/inscription', 'the registration page'],
    ['/une/page/inconnue', 'an unknown page'],
    ['/mentions-legales', 'the legal notice'],
    ['/confidentialite', 'the privacy policy'],
  ])('should be at the bottom of %s (%s) for a visitor', async (path) => {
    renderSite(path);

    expect(await screen.findByRole('contentinfo')).toBeInTheDocument();
  });

  it.each(['/mes-propositions', '/proposer-une-pose'])(
    'should be at the bottom of %s for a signed-in person',
    async (path) => {
      const gateway = new FakeAuthGateway();
      gateway.account = { email: 'alice@example.org' };

      renderSite(path, { gateway });

      expect(await screen.findByRole('contentinfo')).toBeInTheDocument();
    },
  );

  it('should be there while the catalog is loading', async () => {
    renderSite('/', { catalog: { listPublishedPoses: () => new Promise(() => {}) } });

    expect(await screen.findByRole('contentinfo')).toBeInTheDocument();
  });

  it('should be there when the catalog cannot be reached', async () => {
    renderSite('/', {
      catalog: { listPublishedPoses: async () => fail({ code: 'catalog.unreachable', message: 'Indisponible.' }) },
    });

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  });
});
