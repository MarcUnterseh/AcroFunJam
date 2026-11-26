import { fail, ok, type PosePage } from '@acrofunjam/core';
import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CurrentLocation,
  FakeAuthGateway,
  FakePosePageGateway,
  FakePosePhotos,
  renderSite,
} from '../test/site-harness';

// Story 10 « Photos des poses »: the page « Ajouter une photo de Throne » (docs/design/ecrans/10-photos-des-poses.md § 4,
// UX-16 to UX-23), for the validators and the administrators.

const throne: PosePage = {
  id: 'pose-throne',
  name: 'Throne',
  baseDifficulty: 'beginner',
  flyerDifficulty: 'discovery',
  canStartFlow: true,
  canEndFlow: true,
  transitionsFrom: [],
  transitionsTo: [],
  tags: [],
  pendingRevision: false,
  photos: [],
};

const validator = () => {
  const gateway = new FakeAuthGateway();
  gateway.account = {
    email: 'bruno@example.org',
    capabilities: ['propose', 'validate-proposals', 'manage-tags', 'manage-photos'],
  };
  return gateway;
};

const open = (photos = new FakePosePhotos(), posePage = new FakePosePageGateway(ok(throne))) => {
  const site = renderSite(
    '/poses/pose-throne/ajouter-une-photo',
    { posePage, gateway: validator(), photos },
    <CurrentLocation />,
  );
  return { ...site, photos, user: userEvent.setup() };
};

const photoFile = () =>
  new File([new Uint8Array([0xff, 0xd8, 0xff, 0xe0, ...new Array(20).fill(0)])], 'throne-profil.jpg', {
    type: 'image/jpeg',
  });

const fill = async (
  user: ReturnType<typeof userEvent.setup>,
  { file = true, rights = true, altText = 'Throne vu de profil' } = {},
) => {
  if (file) await user.upload(screen.getByLabelText('Photo'), photoFile());
  if (altText) await user.type(screen.getByLabelText('Texte alternatif (facultatif)'), altText);
  await user.type(screen.getByLabelText('Crédit'), 'Léa Martin');
  if (rights) await user.click(screen.getByRole('checkbox'));
};

describe('the page « Ajouter une photo »', () => {
  it('should present the form with its helps, the box of the rights never ticked', async () => {
    open();

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Ajouter une photo de Throne' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Tous les champs sont obligatoires, sauf le texte alternatif.'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Photo')).toHaveAttribute('type', 'file');
    const rights = screen.getByRole('checkbox', {
      name: /Je confirme que l'auteur de la photo a autorisé sa publication/,
    });
    expect(rights).not.toBeChecked();
    expect(
      screen.getByText('AcroFunJam garde ta confirmation avec la photo (ton compte et la date).'),
    ).toBeInTheDocument();
    expect(screen.getByText('0 / 200')).toBeInTheDocument();
  });

  it('should summarise the chosen photo', async () => {
    const { user } = open();
    await screen.findByRole('heading', { level: 1, name: 'Ajouter une photo de Throne' });

    await user.upload(screen.getByLabelText('Photo'), photoFile());

    expect(await screen.findByText('throne-profil.jpg · 2 Mo · 1600 × 1200 pixels')).toBeInTheDocument();
    expect(screen.getByText('Changer de photo')).toBeInTheDocument();
  });

  it('should tell at once that a file is not an accepted photo', async () => {
    const photos = new FakePosePhotos();
    photos.facts = { format: null, size: 1024, dimensions: null };
    const { user } = open(photos);
    await screen.findByRole('heading', { level: 1, name: 'Ajouter une photo de Throne' });

    await user.upload(screen.getByLabelText('Photo'), photoFile());

    await waitFor(() =>
      expect(screen.getByLabelText('Photo')).toHaveAccessibleDescription(
        expect.stringContaining(
          "Ce fichier n'est pas une photo JPEG, PNG, WebP ou HEIC. Choisis une autre photo.",
        ),
      ),
    );
  });

  it('should tell at once that a photo is too small, with its dimensions', async () => {
    const photos = new FakePosePhotos();
    photos.facts = { format: 'jpeg', size: 1024 * 1024, dimensions: { width: 1200, height: 799 } };
    const { user } = open(photos);
    await screen.findByRole('heading', { level: 1, name: 'Ajouter une photo de Throne' });

    await user.upload(screen.getByLabelText('Photo'), photoFile());

    await waitFor(() =>
      expect(screen.getByLabelText('Photo')).toHaveAccessibleDescription(
        expect.stringContaining(
          'Cette photo mesure 1200 × 799 pixels : il faut au moins 800 pixels sur le plus petit côté. Choisis une photo plus grande.',
        ),
      ),
    );
  });

  it('should give every missing field at once and send nothing', async () => {
    const { user, photos } = open();
    await screen.findByRole('heading', { level: 1, name: 'Ajouter une photo de Throne' });

    await user.click(screen.getByRole('button', { name: 'Ajouter la photo' }));

    expect(screen.getByText('Choisis une photo.')).toBeInTheDocument();
    expect(
      screen.getByText("Indique le crédit de la photo : le nom de la personne qui l'a prise."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Confirme tes droits sur la photo et l'accord des personnes photographiées."),
    ).toBeInTheDocument();
    expect(photos.added).toEqual([]);
  });

  it('should send the photo, then come back to the page of the pose and announce it', async () => {
    const { user, photos } = open();
    await screen.findByRole('heading', { level: 1, name: 'Ajouter une photo de Throne' });

    await fill(user);
    await user.click(screen.getByRole('button', { name: 'Ajouter la photo' }));

    await waitFor(() =>
      expect(screen.getByLabelText('Adresse courante')).toHaveTextContent('/poses/pose-throne'),
    );
    expect(photos.added).toMatchObject([
      { poseId: 'pose-throne', altText: 'Throne vu de profil', credit: 'Léa Martin', rightsConfirmed: true },
    ]);
    expect(await screen.findByText('Photo ajoutée à Throne.')).toBeInTheDocument();
  });

  it('should send a photo without alternative text, which is optional', async () => {
    const { user, photos } = open();
    await screen.findByRole('heading', { level: 1, name: 'Ajouter une photo de Throne' });

    await fill(user, { altText: '' });
    await user.click(screen.getByRole('button', { name: 'Ajouter la photo' }));

    expect(await screen.findByText('Photo ajoutée à Throne.')).toBeInTheDocument();
    expect(photos.added).toMatchObject([{ poseId: 'pose-throne', altText: '', credit: 'Léa Martin' }]);
  });

  it('should keep the input and tell why when AcroFunJam cannot be reached', async () => {
    const photos = new FakePosePhotos();
    photos.addAnswer.set(fail({ kind: 'unreachable' }));
    const { user } = open(photos);
    await screen.findByRole('heading', { level: 1, name: 'Ajouter une photo de Throne' });

    await fill(user);
    await user.click(screen.getByRole('button', { name: 'Ajouter la photo' }));

    expect(
      await screen.findByText(
        "La photo n'a pas pu être envoyée : impossible de joindre AcroFunJam. Vérifie ta connexion Internet, puis réessaie.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Texte alternatif (facultatif)')).toHaveValue('Throne vu de profil');
    expect(screen.getByRole('checkbox')).toBeChecked();
  });

  it('should ask to confirm before leaving the page with an input', async () => {
    const { user } = open();
    await screen.findByRole('heading', { level: 1, name: 'Ajouter une photo de Throne' });
    await user.type(screen.getByLabelText('Texte alternatif (facultatif)'), 'Throne');

    await user.click(screen.getByRole('button', { name: 'Annuler' }));

    const question = screen.getByRole('group', { name: 'Abandonner cette photo ? Ta saisie sera perdue.' });
    await user.click(within(question).getByRole('button', { name: "Continuer l'ajout" }));
    expect(screen.getByLabelText('Adresse courante')).toHaveTextContent(
      '/poses/pose-throne/ajouter-une-photo',
    );
    await user.click(screen.getByRole('button', { name: 'Annuler' }));
    await user.click(screen.getByRole('button', { name: 'Abandonner' }));
    await waitFor(() =>
      expect(screen.getByLabelText('Adresse courante')).toHaveTextContent(/^\/poses\/pose-throne$/),
    );
  });

  describe('the confirmation of the abandonment', () => {
    const scrollIntoView = vi.fn();
    beforeEach(() => {
      scrollIntoView.mockClear();
      HTMLElement.prototype.scrollIntoView = scrollIntoView;
    });
    afterEach(() => {
      delete (HTMLElement.prototype as Partial<HTMLElement>).scrollIntoView;
    });

    it('should bring the question into view with the focus, then give it back to « Annuler »', async () => {
      const { user } = open();
      await screen.findByRole('heading', { level: 1, name: 'Ajouter une photo de Throne' });
      await user.type(screen.getByLabelText('Texte alternatif (facultatif)'), 'Throne');

      await user.click(screen.getByRole('button', { name: 'Annuler' }));

      const question = screen.getByText('Abandonner cette photo ? Ta saisie sera perdue.');
      expect(question).toHaveFocus();
      expect(scrollIntoView).toHaveBeenCalledWith({ block: 'center' });
      await user.click(screen.getByRole('button', { name: "Continuer l'ajout" }));
      expect(screen.getByRole('button', { name: 'Annuler' })).toHaveFocus();
    });

    it('should ask from the link back too, then give the focus back to it', async () => {
      const { user } = open();
      await screen.findByRole('heading', { level: 1, name: 'Ajouter une photo de Throne' });
      await user.type(screen.getByLabelText('Crédit'), 'Léa');

      await user.click(screen.getByRole('link', { name: 'Throne' }));

      expect(screen.getByText('Abandonner cette photo ? Ta saisie sera perdue.')).toHaveFocus();
      await user.click(screen.getByRole('button', { name: "Continuer l'ajout" }));
      expect(screen.getByRole('link', { name: 'Throne' })).toHaveFocus();
    });
  });

  it('should ask the browser to confirm closing or reloading the tab with an input', async () => {
    const { user } = open();
    await screen.findByRole('heading', { level: 1, name: 'Ajouter une photo de Throne' });
    await user.type(screen.getByLabelText('Crédit'), 'Léa');

    const unload = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(unload);

    expect(unload.defaultPrevented).toBe(true);
  });

  it('should let the tab close without an input', async () => {
    open();
    await screen.findByRole('heading', { level: 1, name: 'Ajouter une photo de Throne' });

    const unload = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(unload);

    expect(unload.defaultPrevented).toBe(false);
  });

  it('should tell the session expired, keeping the alternative text and the credit', async () => {
    const photos = new FakePosePhotos();
    photos.addAnswer.set(fail({ kind: 'unauthenticated' }));
    const { user } = open(photos);
    await screen.findByRole('heading', { level: 1, name: 'Ajouter une photo de Throne' });

    await fill(user);
    await user.click(screen.getByRole('button', { name: 'Ajouter la photo' }));

    expect(
      await screen.findByText(
        'Ta session a expiré. Connecte-toi de nouveau, puis choisis de nouveau la photo.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Texte alternatif (facultatif)')).toHaveValue('Throne vu de profil');
    expect(screen.getByLabelText('Crédit')).toHaveValue('Léa Martin');
  });

  it('should replace the page in the history when it is cancelled', async () => {
    const { user, router } = open();
    await screen.findByRole('heading', { level: 1, name: 'Ajouter une photo de Throne' });

    await user.click(screen.getByRole('button', { name: 'Annuler' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/poses/pose-throne'));
    expect(router.state.historyAction).toBe('REPLACE');
  });

  it('should replace the page in the history once the photo is added', async () => {
    const { user, router } = open();
    await screen.findByRole('heading', { level: 1, name: 'Ajouter une photo de Throne' });

    await fill(user);
    await user.click(screen.getByRole('button', { name: 'Ajouter la photo' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/poses/pose-throne'));
    expect(router.state.historyAction).toBe('REPLACE');
  });
});

describe('the page « Ajouter une photo » while the pose is read', () => {
  it('should say the pose is loading, with a link back, then give the focus to its title', async () => {
    const posePage = new FakePosePageGateway('held');
    open(undefined, posePage);

    expect(await screen.findByText('Chargement de la pose…')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Retour' })).toHaveAttribute('href', '/poses/pose-throne');
    await act(async () => posePage.page.release(ok(throne)));

    const title = await screen.findByRole('heading', { level: 1, name: 'Ajouter une photo de Throne' });
    await waitFor(() => expect(title).toHaveFocus());
  });

  it('should say « Pose introuvable »', async () => {
    open(undefined, new FakePosePageGateway(fail({ kind: 'not-found' })));

    expect(await screen.findByRole('heading', { level: 1, name: 'Pose introuvable' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Photo')).not.toBeInTheDocument();
  });

  it('should tell the pose could not be read, and read it again', async () => {
    const { user } = open(undefined, new FakePosePageGateway(fail({ kind: 'unreachable' }), ok(throne)));

    expect(
      await screen.findByText('Impossible de charger la pose. Vérifie ta connexion Internet, puis réessaie.'),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Réessayer' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Ajouter une photo de Throne' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Photo')).toBeInTheDocument();
  });
});

describe('the sending of a photo', () => {
  it('should stop the sending, say it in an information and give the focus back to « Ajouter la photo »', async () => {
    const photos = new FakePosePhotos();
    photos.addAnswer.set('held');
    const { user } = open(photos);
    await screen.findByRole('heading', { level: 1, name: 'Ajouter une photo de Throne' });
    await fill(user);
    await user.click(screen.getByRole('button', { name: 'Ajouter la photo' }));

    await user.click(await screen.findByRole('button', { name: "Annuler l'envoi" }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Envoi annulé.');
    expect(alert).toHaveClass('form-alert--info');
    expect(screen.getByRole('button', { name: 'Ajouter la photo' })).toHaveFocus();
    expect(screen.queryByText("Annuler l'envoi")).not.toBeInTheDocument();
  });

  it('should ignore a photo chosen while the sending goes on', async () => {
    const photos = new FakePosePhotos();
    photos.addAnswer.set('held');
    const { user } = open(photos);
    await screen.findByRole('heading', { level: 1, name: 'Ajouter une photo de Throne' });
    await fill(user);
    await user.click(screen.getByRole('button', { name: 'Ajouter la photo' }));
    await screen.findByRole('button', { name: "Annuler l'envoi" });

    await user.upload(
      screen.getByLabelText('Photo'),
      new File([new Uint8Array([0xff, 0xd8])], 'autre.jpg', { type: 'image/jpeg' }),
    );

    expect(screen.getByText(/^throne-profil\.jpg/)).toBeInTheDocument();
    expect(screen.queryByText(/^autre\.jpg/)).not.toBeInTheDocument();
  });

  it('should give the focus to the field « Photo » when AcroFunJam refuses the file', async () => {
    const photos = new FakePosePhotos();
    photos.addAnswer.set(fail({ kind: 'too-large' }));
    const { user } = open(photos);
    await screen.findByRole('heading', { level: 1, name: 'Ajouter une photo de Throne' });

    await fill(user);
    await user.click(screen.getByRole('button', { name: 'Ajouter la photo' }));

    await waitFor(() => expect(screen.getByLabelText('Photo')).toHaveFocus());
    expect(screen.getByLabelText('Photo')).toHaveAccessibleDescription(
      expect.stringContaining('Cette photo doit peser 10 Mo au plus.'),
    );
  });

  it('should give the focus to the alert when AcroFunJam cannot be reached', async () => {
    const photos = new FakePosePhotos();
    photos.addAnswer.set(fail({ kind: 'unreachable' }));
    const { user } = open(photos);
    await screen.findByRole('heading', { level: 1, name: 'Ajouter une photo de Throne' });

    await fill(user);
    await user.click(screen.getByRole('button', { name: 'Ajouter la photo' }));

    await waitFor(() => expect(screen.getByRole('alert')).toHaveFocus());
  });

  it('should tell under the field « Crédit » that the credit must name the author, with the focus', async () => {
    const photos = new FakePosePhotos();
    photos.addAnswer.set(fail({ kind: 'invalid', code: 'photo.credit-not-an-author' }));
    const { user } = open(photos);
    await screen.findByRole('heading', { level: 1, name: 'Ajouter une photo de Throne' });

    await fill(user);
    await user.click(screen.getByRole('button', { name: 'Ajouter la photo' }));

    const credit = screen.getByLabelText('Crédit');
    await waitFor(() => expect(credit).toHaveFocus());
    expect(credit).toHaveAccessibleDescription(
      expect.stringContaining(
        "Le crédit doit nommer la personne qui a pris la photo. Si tu ne sais pas qui l'a prise, n'ajoute pas cette photo.",
      ),
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('should give the errors of the other fields too when the chosen file is refused', async () => {
    const photos = new FakePosePhotos();
    photos.facts = { format: null, size: 1024, dimensions: null };
    const { user } = open(photos);
    await screen.findByRole('heading', { level: 1, name: 'Ajouter une photo de Throne' });
    await user.upload(screen.getByLabelText('Photo'), photoFile());

    await user.click(screen.getByRole('button', { name: 'Ajouter la photo' }));

    expect(
      screen.getByText("Confirme tes droits sur la photo et l'accord des personnes photographiées."),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Photo')).toHaveFocus();
    expect(photos.added).toEqual([]);
  });
});
