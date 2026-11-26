import { fail, ok, type PosePage } from '@acrofunjam/core';
import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import {
  aPosePhoto,
  FakeAuthGateway,
  FakePosePageGateway,
  FakePosePhotos,
  renderSite,
} from '../test/site-harness';

// Story 10 « Photos des poses » (docs/design/ecrans/10-photos-des-poses.md, R16 to R19): the main photo at the top of
// the page, the others at the bottom, the enlargement, and their management by the validators.

const profile = aPosePhoto({ id: 'p1', altText: 'Bird vue de profil', credit: 'Léa Martin' });
const front = aPosePhoto({
  id: 'p2',
  altText: 'Bird vue de face',
  credit: 'Hugo Bernard',
  width: 1200,
  height: 1600,
});
const grips = aPosePhoto({ id: 'p3', altText: 'Bird, les prises', credit: 'Lulu Acro' });

const bird = (photos = [profile, front, grips]): PosePage => ({
  id: 'pose-bird',
  name: 'Bird',
  baseDifficulty: 'discovery',
  flyerDifficulty: 'beginner',
  canStartFlow: true,
  canEndFlow: true,
  transitionsFrom: [],
  transitionsTo: [],
  tags: [],
  pendingRevision: false,
  photos,
});

const validator = () => {
  const gateway = new FakeAuthGateway();
  gateway.account = {
    email: 'bruno@example.org',
    capabilities: ['propose', 'validate-proposals', 'manage-tags', 'manage-photos'],
  };
  return gateway;
};

const open = ({
  page = bird(),
  /** The page as read again after a change of its photos; the same page unless stated otherwise. */
  after,
  path = '/poses/pose-bird',
  gateway = new FakeAuthGateway(),
  photos = new FakePosePhotos(),
}: {
  page?: PosePage;
  after?: PosePage;
  path?: string;
  gateway?: FakeAuthGateway;
  photos?: FakePosePhotos;
} = {}) => {
  const site = renderSite(path, {
    posePage: new FakePosePageGateway(ok(page), ok(after ?? page)),
    gateway,
    photos,
  });
  return { ...site, user: userEvent.setup() };
};

describe('the photos of a pose, for a visitor', () => {
  it('should present only the main photo at the top, with its credit, and a link to the other photos', async () => {
    open();

    const top = await screen.findByRole('region', { name: 'Photos de Bird' });
    expect(within(top).getByRole('img', { name: 'Bird vue de profil' })).toBeInTheDocument();
    expect(within(top).getByText('Photo : Léa Martin')).toBeInTheDocument();
    expect(within(top).queryByRole('img', { name: 'Bird vue de face' })).not.toBeInTheDocument();
    expect(within(top).getByRole('link', { name: 'Voir les 2 autres photos' })).toHaveAttribute(
      'href',
      '#autres-photos',
    );
  });

  it('should present the other photos in the last section of the page, after the transitions', async () => {
    open();

    const bottom = await screen.findByRole('region', { name: 'Autres photos de Bird' });
    expect(
      within(bottom)
        .getAllByRole('img')
        .map((img) => img.getAttribute('alt')),
    ).toEqual(['Bird vue de face', 'Bird, les prises']);
    expect(within(bottom).getByText('Photo : Hugo Bernard')).toBeInTheDocument();
    const sections = screen.getAllByRole('region').map((region) => region.getAttribute('aria-labelledby'));
    expect(screen.getAllByRole('region').at(-1)).toBe(bottom);
    expect(sections.length).toBeGreaterThan(2);
  });

  it("should say « Voir l'autre photo » when there is one other photo", async () => {
    open({ page: bird([profile, front]) });

    expect(await screen.findByRole('link', { name: "Voir l'autre photo" })).toBeInTheDocument();
  });

  it('should present neither link nor bottom section when the pose has only its main photo', async () => {
    open({ page: bird([profile]) });

    await screen.findByRole('region', { name: 'Photos de Bird' });
    expect(screen.queryByRole('link', { name: /Voir l/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Autres photos de Bird' })).not.toBeInTheDocument();
  });

  it('should present no photo section for a pose without photo', async () => {
    open({ page: bird([]) });

    await screen.findByRole('heading', { level: 1, name: 'Bird' });
    expect(screen.queryByRole('region', { name: 'Photos de Bird' })).not.toBeInTheDocument();
  });

  it('should not tell a visitor which photo is the main one', async () => {
    open();

    await screen.findByRole('region', { name: 'Photos de Bird' });
    expect(screen.queryByText('Photo principale (vignette du catalogue)')).not.toBeInTheDocument();
  });

  it('should enlarge a photo in a dialog, browse to the next one and close it', async () => {
    const { user, router } = open();

    await user.click(await screen.findByRole('button', { name: 'Agrandir la photo : Bird vue de face' }));

    const dialog = screen.getByRole('dialog', { name: 'Photo 2 sur 3 de Bird' });
    expect(within(dialog).getByRole('img', { name: 'Bird vue de face' })).toBeInTheDocument();
    expect(router.state.location.search).toBe('?photo=2');
    await user.click(within(dialog).getByRole('button', { name: 'Photo suivante' }));
    expect(screen.getByRole('dialog', { name: 'Photo 3 sur 3 de Bird' })).toBeInTheDocument();
    expect(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Photo suivante' }),
    ).toHaveAttribute('aria-disabled', 'true');
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Fermer' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('should announce the photo shown when browsing the enlargement', async () => {
    const { user } = open();

    await user.click(await screen.findByRole('button', { name: 'Agrandir la photo : Bird vue de face' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Photo suivante' }));

    expect(await screen.findByText('Photo 3 sur 3 de Bird : Bird, les prises')).toBeInTheDocument();
  });

  it('should give the focus back to the photo enlarged when the enlargement is closed', async () => {
    const { user } = open();
    const enlarge = await screen.findByRole('button', { name: 'Agrandir la photo : Bird vue de face' });

    await user.click(enlarge);
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Fermer' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await waitFor(() => expect(enlarge).toHaveFocus());
  });

  it('should give the focus back to the photo enlarged when going back', async () => {
    const { user, router } = open();
    const enlarge = await screen.findByRole('button', { name: 'Agrandir la photo : Bird, les prises' });

    await user.click(enlarge);
    await act(() => router.navigate(-1));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await waitFor(() => expect(enlarge).toHaveFocus());
  });

  it('should open the enlargement from the address', async () => {
    open({ path: '/poses/pose-bird?photo=1' });

    expect(await screen.findByRole('dialog', { name: 'Photo 1 sur 3 de Bird' })).toBeInTheDocument();
  });
});

describe('the photos of a pose without alternative text', () => {
  const untold = aPosePhoto({ id: 'p2', altText: null, credit: 'Hugo Bernard' });

  it('should describe a photo without alternative text by its rank and its pose', async () => {
    const { user } = open({ page: bird([profile, untold, grips]) });

    const bottom = await screen.findByRole('region', { name: 'Autres photos de Bird' });
    expect(
      within(bottom)
        .getAllByRole('img')
        .map((img) => img.getAttribute('alt')),
    ).toEqual(['Photo 2 de Bird', 'Bird, les prises']);
    await user.click(within(bottom).getByRole('button', { name: 'Agrandir la photo : Photo 2 de Bird' }));
    const dialog = screen.getByRole('dialog', { name: 'Photo 2 sur 3 de Bird' });
    expect(within(dialog).getByRole('img', { name: 'Photo 2 de Bird' })).toBeInTheDocument();
  });

  it('should describe the main photo without alternative text as the first one', async () => {
    open({ page: bird([aPosePhoto({ id: 'p1', altText: null }), front]) });

    const top = await screen.findByRole('region', { name: 'Photos de Bird' });
    expect(within(top).getByRole('img', { name: 'Photo 1 de Bird' })).toBeInTheDocument();
  });

  it('should name the buttons of a photo without alternative text after its rank and its pose', async () => {
    const { user } = open({ gateway: validator(), page: bird([profile, untold, grips]) });

    const bottom = await screen.findByRole('region', { name: 'Autres photos de Bird' });
    for (const name of [
      'Choisir comme photo principale : Photo 2 de Bird',
      'Modifier le texte alternatif et le crédit : Photo 2 de Bird',
      'Retirer la photo : Photo 2 de Bird',
    ])
      expect(within(bottom).getByRole('button', { name })).toBeInTheDocument();
    await user.click(within(bottom).getByRole('button', { name: /^Modifier .*Photo 2 de Bird$/ }));
    expect(
      within(screen.getByRole('group', { name: 'Texte alternatif et crédit' })).getByLabelText(
        'Texte alternatif (facultatif)',
      ),
    ).toHaveValue('');
  });
});

describe('the photos of a pose, for a validator', () => {
  it('should invite to add the first photo at the top of a pose without photo', async () => {
    open({ page: bird([]), gateway: validator() });

    const top = await screen.findByRole('region', { name: 'Photos de Bird' });
    expect(within(top).getByText("Bird n'a pas encore de photo.")).toBeInTheDocument();
    expect(within(top).getByRole('link', { name: 'Ajouter une photo de Bird' })).toHaveAttribute(
      'href',
      '/poses/pose-bird/ajouter-une-photo',
    );
    expect(within(top).queryByText('0 photo sur 5')).not.toBeInTheDocument();
  });

  it('should mark the main photo and count the photos in the bottom section', async () => {
    open({ gateway: validator() });

    const top = await screen.findByRole('region', { name: 'Photos de Bird' });
    expect(within(top).getByText('Photo principale (vignette du catalogue)')).toBeInTheDocument();
    const bottom = screen.getByRole('region', { name: 'Autres photos de Bird' });
    expect(within(bottom).getByText('3 photos sur 5')).toBeInTheDocument();
    expect(within(bottom).getByRole('link', { name: 'Ajouter une photo de Bird' })).toBeInTheDocument();
  });

  it('should put the invitation under the main photo when the pose has only one', async () => {
    open({ page: bird([profile]), gateway: validator() });

    const top = await screen.findByRole('region', { name: 'Photos de Bird' });
    expect(within(top).getByText('1 photo sur 5')).toBeInTheDocument();
    expect(within(top).getByRole('link', { name: 'Ajouter une photo de Bird' })).toBeInTheDocument();
  });

  it('should say the maximum is reached instead of inviting, at 5 photos', async () => {
    const five = ['a', 'b', 'c', 'd', 'e'].map((id) => aPosePhoto({ id, altText: `Bird ${id}` }));
    open({ page: bird(five), gateway: validator() });

    const bottom = await screen.findByRole('region', { name: 'Autres photos de Bird' });
    expect(
      within(bottom).getByText(
        'Bird a déjà 5 photos, le maximum. Retire une photo pour en ajouter une autre.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Ajouter une photo de Bird' })).not.toBeInTheDocument();
  });

  it('should choose another main photo and announce it', async () => {
    const photos = new FakePosePhotos();
    const { user } = open({ gateway: validator(), photos });

    await user.click(
      await screen.findByRole('button', { name: 'Choisir comme photo principale : Bird vue de face' }),
    );

    await waitFor(() => expect(photos.chosen).toEqual([{ poseId: 'pose-bird', photoId: 'p2' }]));
    expect(
      // Testing Library collapses the narrow no-break spaces of the text (checked in @acrofunjam/core).
      await screen.findByText('« Bird vue de face » est maintenant la photo principale de Bird.'),
    ).toBeInTheDocument();
  });

  it('should give the focus to the new main photo once the page is read again', async () => {
    const { user } = open({ gateway: validator(), after: bird([front, profile, grips]) });

    await user.click(
      await screen.findByRole('button', { name: 'Choisir comme photo principale : Bird vue de face' }),
    );

    await waitFor(() =>
      expect(
        within(screen.getByRole('region', { name: 'Photos de Bird' })).getByRole('button', {
          name: 'Agrandir la photo : Bird vue de face',
        }),
      ).toHaveFocus(),
    );
  });

  it('should give the focus to the question when « Retirer » is opened', async () => {
    const { user } = open({ gateway: validator() });

    await user.click(await screen.findByRole('button', { name: 'Retirer la photo : Bird vue de face' }));

    expect(screen.getByText('Retirer cette photo de Bird ?')).toHaveFocus();
  });

  it('should give the focus back to « Retirer » when the removal is cancelled', async () => {
    const { user } = open({ gateway: validator() });

    await user.click(await screen.findByRole('button', { name: 'Retirer la photo : Bird vue de face' }));
    await user.click(
      within(screen.getByRole('group', { name: 'Retirer cette photo de Bird ?' })).getByRole('button', {
        name: 'Annuler',
      }),
    );

    expect(screen.getByRole('button', { name: 'Retirer la photo : Bird vue de face' })).toHaveFocus();
  });

  it('should give the focus to « Photos de Bird » once the main photo is removed', async () => {
    const { user } = open({ gateway: validator(), after: bird([front, grips]) });

    await user.click(await screen.findByRole('button', { name: 'Retirer la photo : Bird vue de profil' }));
    await user.click(screen.getByRole('button', { name: 'Retirer la photo' }));

    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 2, name: 'Photos de Bird' })).toHaveFocus(),
    );
  });

  it('should give the focus to « Autres photos de Bird » once another photo is removed', async () => {
    const { user } = open({ gateway: validator(), after: bird([profile, front]) });

    await user.click(await screen.findByRole('button', { name: 'Retirer la photo : Bird, les prises' }));
    await user.click(screen.getByRole('button', { name: 'Retirer la photo' }));

    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 2, name: 'Autres photos de Bird' })).toHaveFocus(),
    );
  });

  it('should give the focus to the alternative text when « Modifier » is opened', async () => {
    const { user } = open({ gateway: validator() });

    await user.click(
      await screen.findByRole('button', {
        name: 'Modifier le texte alternatif et le crédit : Bird vue de face',
      }),
    );

    expect(screen.getByLabelText('Texte alternatif (facultatif)')).toHaveFocus();
  });

  it('should count the characters and give the example when correcting in place', async () => {
    const { user } = open({ gateway: validator() });

    await user.click(
      await screen.findByRole('button', {
        name: 'Modifier le texte alternatif et le crédit : Bird vue de face',
      }),
    );

    const zone = screen.getByRole('group', { name: 'Texte alternatif et crédit' });
    expect(within(zone).getByText('16 / 200')).toBeInTheDocument();
    expect(within(zone).getByText('12 / 100')).toBeInTheDocument();
    expect(within(zone).getByLabelText('Texte alternatif (facultatif)')).toHaveAccessibleDescription(
      expect.stringContaining('Exemple : Bird'),
    );
  });

  it('should give the focus back to « Modifier » when the correction is cancelled', async () => {
    const { user } = open({ gateway: validator() });
    const name = 'Modifier le texte alternatif et le crédit : Bird vue de face';

    await user.click(await screen.findByRole('button', { name }));
    await user.click(
      within(screen.getByRole('group', { name: 'Texte alternatif et crédit' })).getByRole('button', {
        name: 'Annuler',
      }),
    );

    expect(screen.getByRole('button', { name })).toHaveFocus();
  });

  it('should tell under the field « Crédit » that the credit must name the author', async () => {
    const photos = new FakePosePhotos();
    photos.answer.set(fail({ kind: 'invalid', code: 'photo.credit-not-an-author' }));
    const { user } = open({ gateway: validator(), photos });

    await user.click(
      await screen.findByRole('button', {
        name: 'Modifier le texte alternatif et le crédit : Bird vue de face',
      }),
    );
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    const credit = screen.getByLabelText('Crédit');
    await waitFor(() => expect(credit).toHaveFocus());
    expect(credit).toHaveAccessibleDescription(
      expect.stringContaining("Si tu ne sais pas qui l'a prise, n'ajoute pas cette photo."),
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('should give the focus back to « Modifier » once the correction is saved', async () => {
    const { user } = open({ gateway: validator() });
    const name = 'Modifier le texte alternatif et le crédit : Bird vue de face';

    await user.click(await screen.findByRole('button', { name }));
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    await waitFor(() => expect(screen.getByRole('button', { name })).toHaveFocus());
  });

  it('should confirm the removal of the main photo, saying what it changes, then remove it', async () => {
    const photos = new FakePosePhotos();
    const { user } = open({ gateway: validator(), photos });

    await user.click(await screen.findByRole('button', { name: 'Retirer la photo : Bird vue de profil' }));

    const zone = screen.getByRole('group', { name: 'Retirer cette photo de Bird ?' });
    expect(
      within(zone).getByText('La photo suivante deviendra la photo principale et la vignette du catalogue.'),
    ).toBeInTheDocument();
    await user.click(within(zone).getByRole('button', { name: 'Retirer la photo' }));
    await waitFor(() => expect(photos.removed).toEqual([{ poseId: 'pose-bird', photoId: 'p1' }]));
    expect(await screen.findByText('Photo retirée de Bird.')).toBeInTheDocument();
  });

  it('should say the pose will have no photo when its last one is removed', async () => {
    const { user } = open({ page: bird([profile]), gateway: validator() });

    await user.click(await screen.findByRole('button', { name: 'Retirer la photo : Bird vue de profil' }));

    expect(screen.getByText("Bird n'aura plus de photo.")).toBeInTheDocument();
  });

  it('should correct the alternative text and the credit in place', async () => {
    const photos = new FakePosePhotos();
    const { user } = open({ gateway: validator(), photos });

    await user.click(
      await screen.findByRole('button', {
        name: 'Modifier le texte alternatif et le crédit : Bird vue de face',
      }),
    );
    const zone = screen.getByRole('group', { name: 'Texte alternatif et crédit' });
    const credit = within(zone).getByLabelText('Crédit');
    await user.clear(credit);
    await user.type(credit, 'Hugo B.');
    await user.click(within(zone).getByRole('button', { name: 'Enregistrer' }));

    await waitFor(() =>
      expect(photos.corrected).toEqual([
        { poseId: 'pose-bird', photoId: 'p2', altText: 'Bird vue de face', credit: 'Hugo B.' },
      ]),
    );
    expect(await screen.findByText('Texte alternatif et crédit enregistrés.')).toBeInTheDocument();
  });

  it('should save the correction when the alternative text is emptied, which is optional', async () => {
    const photos = new FakePosePhotos();
    const { user } = open({ gateway: validator(), photos });

    await user.click(
      await screen.findByRole('button', {
        name: 'Modifier le texte alternatif et le crédit : Bird vue de face',
      }),
    );
    const zone = screen.getByRole('group', { name: 'Texte alternatif et crédit' });
    await user.clear(within(zone).getByLabelText('Texte alternatif (facultatif)'));
    await user.click(within(zone).getByRole('button', { name: 'Enregistrer' }));

    await waitFor(() =>
      expect(photos.corrected).toEqual([
        { poseId: 'pose-bird', photoId: 'p2', altText: '', credit: 'Hugo Bernard' },
      ]),
    );
  });

  it('should tell the session expired when a removal is refused', async () => {
    const photos = new FakePosePhotos();
    photos.answer.set(fail({ kind: 'unauthenticated' }));
    const { user } = open({ gateway: validator(), photos });

    await user.click(await screen.findByRole('button', { name: 'Retirer la photo : Bird, les prises' }));
    await user.click(
      within(screen.getByRole('group', { name: 'Retirer cette photo de Bird ?' })).getByRole('button', {
        name: 'Retirer la photo',
      }),
    );

    // The session is closed: the site says it (session banner), and the management of the photos goes away.
    expect((await screen.findAllByText(/Ta session a expiré/)).length).toBeGreaterThan(0);
  });
});
