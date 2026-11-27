import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CurrentLocation, FakeAuthGateway, FakeSessionMemory, renderSite } from '../test/site-harness';

const section = (anchor: string) => {
  const heading = document.getElementById(anchor);
  if (!heading?.parentElement) throw new Error(`No section #${anchor}`);
  return within(heading.parentElement);
};

const contactLinksIn = (anchor: string) =>
  section(anchor)
    .getAllByRole('link')
    .filter((link) => link.getAttribute('href') === 'mailto:contact@acrofunjam.fr');

/** A site whose API never answers nor succeeds: the legal pages must not need it (UX-34). */
const withoutApi = () => {
  const gateway = new FakeAuthGateway();
  gateway.accountUnreachable = true;
  return {
    gateway,
    catalog: { listPublishedPoses: () => new Promise<never>(() => {}) },
  };
};

describe('legal notice', () => {
  it('should be titled « Mentions légales », dated under its title', async () => {
    renderSite('/mentions-legales');

    const title = await screen.findByRole('heading', { level: 1, name: 'Mentions légales' });
    const date = screen.getByText(/^Dernière mise à jour :/);
    expect(date.querySelector('time')).toHaveAttribute('datetime', '2026-11-27');
    expect(title.compareDocumentPosition(date) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    await waitFor(() => expect(document.title).toBe('Mentions légales – AcroFunJam'));
  });

  it('should present the publisher as a personal, non-professional site, without naming anyone', async () => {
    renderSite('/mentions-legales');
    await screen.findByRole('heading', { level: 1, name: 'Mentions légales' });

    expect(section('editeur').getByText(/site personnel non professionnel/)).toBeInTheDocument();
  });

  it('should give the contact address as a link that prepares a message', async () => {
    renderSite('/mentions-legales');
    await screen.findByRole('heading', { level: 1, name: 'Mentions légales' });

    expect(contactLinksIn('contact')).not.toHaveLength(0);
  });

  it('should present the host of the site with its name, address and phone', async () => {
    renderSite('/mentions-legales');
    await screen.findByRole('heading', { level: 1, name: 'Mentions légales' });

    const host = section('hebergement-du-site');
    expect(host.getByText('IONOS SARL')).toBeInTheDocument();
    expect(host.getByText('57201 Sarreguemines Cedex')).toBeInTheDocument();
    expect(host.getByText(/Téléphone/)).toBeInTheDocument();
  });

  it('should explain the photos, how to ask for a withdrawal and lead to the privacy policy', async () => {
    renderSite('/mentions-legales');
    await screen.findByRole('heading', { level: 1, name: 'Mentions légales' });

    expect(section('photos-et-contenus').getByText(/crédit/)).toBeInTheDocument();
    expect(contactLinksIn('demander-un-retrait')).not.toHaveLength(0);
    expect(
      section('donnees-personnelles').getByRole('link', { name: /politique de confidentialité/i }),
    ).toHaveAttribute('href', '/confidentialite');
  });

  it('should be shown although the API does not answer', async () => {
    renderSite('/mentions-legales', withoutApi());

    expect(await screen.findByRole('heading', { level: 1, name: 'Mentions légales' })).toBeInTheDocument();
  });
});

describe('privacy policy', () => {
  const open = async () => {
    renderSite('/confidentialite');
    await screen.findByRole('heading', { level: 1, name: 'Politique de confidentialité' });
  };

  it('should be titled, dated under its title, and open with « En bref »', async () => {
    await open();

    expect(screen.getByText(/^Dernière mise à jour :/).querySelector('time')).toHaveAttribute(
      'datetime',
      '2026-11-27',
    );
    expect(screen.getByRole('region', { name: 'En bref' })).toBeInTheDocument();
    await waitFor(() => expect(document.title).toBe('Politique de confidentialité – AcroFunJam'));
  });

  it('should list its sections in a summary', async () => {
    await open();

    const summary = within(screen.getByRole('navigation', { name: 'Sommaire' }));
    expect(summary.getByRole('link', { name: 'Tes droits et comment les exercer' })).toHaveAttribute(
      'href',
      '#tes-droits',
    );
  });

  it.each([
    ['Ton compte', "jusqu'à la suppression du compte"],
    ['Tes propositions', "tant qu'AcroFunJam existe"],
    ['La confirmation des droits sur une photo', 'aussi longtemps que la photo'],
    ['Les photos', "jusqu'à leur retrait"],
    ['La confirmation des droits sur une vidéo', 'aussi longtemps que la vidéo'],
    ['Les vidéos', "jusqu'à leur retrait"],
    ['Le cookie de session', "jusqu'à la déconnexion, au plus 14 jours après la dernière visite"],
    ['Les sauvegardes', '30 jours'],
    ['Les journaux du serveur', '14 jours'],
  ])('should keep « %s » « %s »', async (data, duration) => {
    await open();

    const table = within(
      screen.getByRole('table', { name: 'Combien de temps AcroFunJam garde tes données' }),
    );
    const row = table
      .getAllByRole('row')
      .find((candidate) => within(candidate).queryByRole('rowheader', { name: new RegExp(`^${data}`) }));
    expect(row).toBeDefined();
    expect(row).toHaveTextContent(new RegExp(duration, 'i'));
  });

  it('should say how a video is published: credit, caption, optional description, without sound nor metadata, the people filmed never named (V21)', async () => {
    await open();

    const data = section('tes-donnees');
    expect(data.getByRole('heading', { level: 3, name: 'Les vidéos' })).toBeInTheDocument();
    expect(data.getByText(/Une vidéo est publiée/)).toHaveTextContent(
      /crédit.*légende.*description.*personnes filmées ne sont jamais nommées/,
    );
    expect(data.getByText(/retire de chaque vidéo/)).toHaveTextContent(
      /retire de chaque vidéo la bande son et toutes ses métadonnées/,
    );
    expect(data.getByText(/Quand une personne ajoute une vidéo/)).toHaveTextContent(
      /ont donné leur accord, et qu.aucune personne mineure n.y est reconnaissable\./,
    );
  });

  it('should name the data of the account, its security data, and what becomes of the proposals', async () => {
    await open();

    const data = section('tes-donnees');
    expect(data.getByText(/tentatives de connexion/)).toBeInTheDocument();
    expect(data.getByText(/ne sont plus rattachées à ton adresse/)).toBeInTheDocument();
  });

  it.each([
    ['IONOS', 'le serveur, la base de données et la messagerie'],
    ['Cloudflare', 'les photos, les vidéos et les sauvegardes'],
  ])('should name the processor %s, which hosts %s', async (processor, hosted) => {
    await open();

    const item = section('ou-sont-tes-donnees')
      .getAllByRole('listitem')
      .find((candidate) => candidate.textContent?.includes(processor));
    expect(item).toHaveTextContent(hosted);
  });

  it('should say that Cloudflare may store the photos and the backups outside the European Union, and under which guarantees', async () => {
    await open();

    const item = section('ou-sont-tes-donnees')
      .getAllByRole('listitem')
      .find((candidate) => candidate.textContent?.includes('Cloudflare'));
    expect(item).toHaveTextContent(/hors de l'Union européenne/);
    expect(item).toHaveTextContent(/Data Privacy Framework/);
  });

  it('should say that the session cookie, strictly necessary, is the only one, without audience measurement nor tracker', async () => {
    await open();

    const cookie = section('cookie-et-stockage');
    expect(cookie.getByText(/seul cookie/)).toHaveTextContent(/strictement nécessaire/);
    expect(cookie.getByText(/Aucune mesure d'audience/)).toHaveTextContent(/traceur/);
    expect(cookie.getByText(/dans ton navigateur,/)).toBeInTheDocument();
  });

  it.each([
    ['tes-droits', /accéder/],
    ['tes-droits', /t'opposer/],
    ['supprimer-ton-compte', /depuis l'adresse de ton compte/],
    ['retirer-une-photo-ou-une-video', /une seule demande/],
    ['retirer-une-photo-ou-une-video', /vidéo/],
  ])(
    'should explain in #%s how to make the request %s by writing to the contact address',
    async (anchor, words) => {
      await open();

      expect(section(anchor).getAllByText(words).length).toBeGreaterThan(0);
      expect(contactLinksIn(anchor)).not.toHaveLength(0);
    },
  );

  it('should promise an answer within a month, and say how long the backups keep a deleted account', async () => {
    await open();

    expect(section('tes-droits').getByText(/sous un mois/)).toBeInTheDocument();
    expect(section('supprimer-ton-compte').getByText(/30 jours/)).toBeInTheDocument();
  });

  it('should tell how to lodge a complaint with the CNIL', async () => {
    await open();

    expect(section('reclamation-cnil').getByRole('link', { name: /CNIL/ })).toHaveAttribute(
      'href',
      expect.stringMatching(/^https:\/\/www\.cnil\.fr/),
    );
  });

  it('should ask to be 15 years old at least to create an account', async () => {
    await open();

    expect(section('mineurs').getByText(/15 ans/)).toBeInTheDocument();
  });

  it('should be shown although the API does not answer', async () => {
    renderSite('/confidentialite', withoutApi());

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Politique de confidentialité' }),
    ).toBeInTheDocument();
  });
});

describe('arriving directly on a legal page', () => {
  it.each([
    ['/mentions-legales', 'Mentions légales'],
    ['/confidentialite', 'Politique de confidentialité'],
  ])('should show %s without asking to sign in, even after an expired session', async (path, title) => {
    renderSite(path, { memory: new FakeSessionMemory(true) }, <CurrentLocation />);

    expect(await screen.findByRole('heading', { level: 1, name: title })).toBeInTheDocument();
    expect(screen.getByLabelText('Adresse courante')).toHaveTextContent(path);
    expect(screen.queryByRole('form', { name: 'Se connecter' })).not.toBeInTheDocument();
  });
});

describe('arriving on a section of a legal page', () => {
  it('should scroll to the section named in the address', async () => {
    const scrolled: string[] = [];
    // jsdom does not lay out: scrollIntoView is not defined.
    Element.prototype.scrollIntoView = vi.fn(function (this: Element) {
      scrolled.push(this.id);
    });
    try {
      renderSite('/confidentialite#tes-droits');

      await screen.findByRole('heading', { level: 1, name: 'Politique de confidentialité' });
      expect(scrolled).toContain('tes-droits');
    } finally {
      delete (Element.prototype as Partial<Element>).scrollIntoView;
    }
  });
});

describe('first visit', () => {
  it('should ask no consent to cookies', async () => {
    renderSite('/');

    await screen.findByRole('heading', { level: 1, name: 'Catalogue des poses' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByText(/consentement|accepter les cookies/i)).not.toBeInTheDocument();
  });
});

describe('registration page', () => {
  it('should lead to the privacy policy before the field « Adresse e-mail »', async () => {
    renderSite('/inscription');

    const link = await screen.findByRole('link', { name: 'politique de confidentialité' });
    expect(link).toHaveAttribute('href', '/confidentialite');
    const email = screen.getByLabelText('Adresse e-mail');
    expect(link.compareDocumentPosition(email) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('should not show it on the sign-in page', async () => {
    renderSite('/connexion');

    await screen.findByLabelText('Adresse e-mail');
    expect(screen.getByRole('main').querySelector('a[href="/confidentialite"]')).toBeNull();
  });
});
