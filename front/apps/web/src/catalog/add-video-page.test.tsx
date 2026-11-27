import { fail, ok, type PosePage } from '@acrofunjam/core';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import {
  aTransitionVideo,
  CurrentLocation,
  FakeAuthGateway,
  FakePosePageGateway,
  FakeTransitionVideos,
  renderSite,
} from '../test/site-harness';

// Story 12 « Vidéos des transitions »: the page « Ajouter une vidéo à Pop to Bird »
// (docs/design/ecrans/12-videos-des-transitions.md § 3, champ-video.md; V22, UX-55, UX-57, UX-59).

const throne: PosePage = {
  id: 'pose-throne',
  name: 'Throne',
  baseDifficulty: 'beginner',
  flyerDifficulty: 'discovery',
  canStartFlow: true,
  canEndFlow: true,
  transitionsFrom: [
    {
      id: 't-pop-to-bird',
      otherPose: { id: 'pose-bird', name: 'Bird' },
      name: 'Pop to Bird',
      baseDifficulty: 'intermediate',
      flyerDifficulty: 'intermediate',
      description: null,
      tags: [],
      videos: [],
    },
  ],
  transitionsTo: [],
  tags: [],
  pendingRevision: false,
  photos: [],
};

const validator = () => {
  const gateway = new FakeAuthGateway();
  gateway.account = {
    email: 'bruno@example.org',
    capabilities: ['propose', 'validate-proposals', 'manage-tags', 'manage-photos', 'manage-videos'],
  };
  return gateway;
};

const open = (videos = new FakeTransitionVideos()) => {
  const site = renderSite(
    '/poses/pose-throne/transitions/t-pop-to-bird/ajouter-une-video',
    { posePage: new FakePosePageGateway(ok(throne)), gateway: validator(), videos },
    <CurrentLocation />,
  );
  return { ...site, videos, user: userEvent.setup() };
};

/** What the live region of the site says. */
const announcements = () => screen.getAllByRole('status').map((status) => status.textContent);

const videoFile = () => new File([new Uint8Array(64)], 'pop-to-bird.mp4', { type: 'video/mp4' });

const fill = async (
  user: ReturnType<typeof userEvent.setup>,
  { file = true, rights = true, caption = 'Pop to Bird, vue de côté' } = {},
) => {
  if (file) await user.upload(screen.getByLabelText('Vidéo'), videoFile());
  if (caption) await user.type(screen.getByLabelText('Légende'), caption);
  await user.type(screen.getByLabelText('Crédit'), 'Léa Martin');
  if (rights) await user.click(screen.getByRole('checkbox'));
};

describe('the page « Ajouter une vidéo à Pop to Bird »', () => {
  it('should be titled after the transition, with the confirmation of the rights never checked', async () => {
    open();

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Ajouter une vidéo à Pop to Bird' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('checkbox', {
        name: "Je confirme que l'auteur de la vidéo a autorisé sa publication sur AcroFunJam, que chaque personne filmée l'a acceptée, et qu'aucune personne mineure n'y est reconnaissable.",
      }),
    ).not.toBeChecked();
    expect(
      screen.getByText('AcroFunJam garde ta confirmation avec la vidéo (ton compte et la date).'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Description de la vidéo (facultative)')).toBeInTheDocument();
    // « (facultative) » is not in bold, as the label (champ.md).
    expect(screen.getByText('(facultative)', { selector: 'label span' })).toHaveClass('field__optional');
  });

  it('should sum the chosen video up, and refuse it at once when it is too long, truncated to the second', async () => {
    const videos = new FakeTransitionVideos();
    videos.facts = { ...videos.facts, durationMs: 31_700 };
    const { user } = open(videos);
    await screen.findByRole('heading', { level: 1, name: 'Ajouter une vidéo à Pop to Bird' });

    await user.upload(screen.getByLabelText('Vidéo'), videoFile());

    expect(
      await screen.findByText('pop-to-bird.mp4 · 20 Mo · 31 secondes · 1920 × 1080 pixels'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Cette vidéo dure 31 secondes : 30 secondes au plus. Raccourcis-la sur ton appareil, puis choisis\u2011la de nouveau.',
        { selector: '.field__error span' },
      ),
    ).toBeInTheDocument();
  });

  it('should send the video, then come back to the transition on the page of the pose and announce it', async () => {
    const { user, videos } = open();
    await screen.findByRole('heading', { level: 1, name: 'Ajouter une vidéo à Pop to Bird' });

    await fill(user);
    await user.type(screen.getByLabelText(/^Description de la vidéo/), 'La base pousse.');
    await user.click(screen.getByRole('button', { name: 'Ajouter la vidéo' }));

    await waitFor(() =>
      expect(screen.getByLabelText('Adresse courante')).toHaveTextContent('/poses/pose-throne'),
    );
    expect(videos.added).toMatchObject([
      {
        transitionId: 't-pop-to-bird',
        caption: 'Pop to Bird, vue de côté',
        credit: 'Léa Martin',
        description: 'La base pousse.',
        rightsConfirmed: true,
      },
    ]);
    expect(
      await screen.findByText("Vidéo ajoutée à Pop to Bird. Elle sera présentée dès qu'elle sera prête."),
    ).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('heading', { level: 3, name: 'Pop to Bird' })).toHaveFocus());
  });

  it('should come back to the transition, its title focused, with « Annuler »', async () => {
    const { user } = open();
    await screen.findByRole('heading', { level: 1, name: 'Ajouter une vidéo à Pop to Bird' });

    await user.click(screen.getByRole('button', { name: 'Annuler' }));

    await waitFor(() => expect(screen.getByRole('heading', { level: 3, name: 'Pop to Bird' })).toHaveFocus());
    expect(screen.getByRole('heading', { level: 1, name: 'Throne' })).not.toHaveFocus();
  });

  it('should tell a video the browser cannot preview, with the reason first', async () => {
    const { user } = open();
    await screen.findByRole('heading', { level: 1, name: 'Ajouter une vidéo à Pop to Bird' });

    await user.upload(screen.getByLabelText('Vidéo'), videoFile());
    fireEvent.error(await screen.findByLabelText('Aperçu de la vidéo choisie'));

    expect(
      await screen.findByText(
        "Pas d'aperçu : ton navigateur ne sait pas lire cette vidéo. AcroFunJam la préparera après l'envoi.",
      ),
    ).toBeInTheDocument();
  });

  it('should not tell a refused video without preview that AcroFunJam will prepare it', async () => {
    const videos = new FakeTransitionVideos();
    videos.facts = { ...videos.facts, durationMs: 31_700 };
    const { user } = open(videos);
    await screen.findByRole('heading', { level: 1, name: 'Ajouter une vidéo à Pop to Bird' });

    await user.upload(screen.getByLabelText('Vidéo'), videoFile());

    await screen.findByText(/^Cette vidéo dure 31 secondes/, { selector: '.field__error span' });
    fireEvent.error(screen.getByLabelText('Aperçu de la vidéo choisie'));
    expect(screen.queryByText(/^Pas d'aperçu/)).toBeNull();
  });

  it("should announce the sending once, and keep « Annuler l'envoi » while the file is being sent", async () => {
    const videos = new FakeTransitionVideos();
    videos.progress = 0.5;
    videos.addAnswer.set('held');
    const { user } = open(videos);
    await screen.findByRole('heading', { level: 1, name: 'Ajouter une vidéo à Pop to Bird' });

    await fill(user);
    await user.click(screen.getByRole('button', { name: 'Ajouter la vidéo' }));

    expect(await screen.findByRole('button', { name: 'Envoi de la vidéo…' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: "Annuler l'envoi" })).toBeInTheDocument();
    await waitFor(() => expect(announcements()).toContain('Envoi de la vidéo…'));
  });

  it('should tell « Vérification de la vidéo… » once the whole file is sent, until the API answers', async () => {
    const videos = new FakeTransitionVideos();
    videos.progress = 1;
    videos.addAnswer.set('held');
    const { user } = open(videos);
    await screen.findByRole('heading', { level: 1, name: 'Ajouter une vidéo à Pop to Bird' });

    await fill(user);
    await user.click(screen.getByRole('button', { name: 'Ajouter la vidéo' }));

    const main = within(screen.getByRole('main'));
    expect(
      await main.findByText('Vérification de la vidéo…', { selector: 'label span' }),
    ).toBeInTheDocument();
    expect(main.getByRole('button', { name: 'Vérification de la vidéo…' })).toBeInTheDocument();
    expect(main.queryByRole('button', { name: "Annuler l'envoi" })).toBeNull();
    await waitFor(() => expect(announcements()).toContain('Vérification de la vidéo…'));
    videos.addAnswer.release(ok(aTransitionVideo({ preparation: 'in-preparation', sources: null })));
    await waitFor(() => expect(main.queryByText('Vérification de la vidéo…')).toBeNull());
  });

  it.each([
    [{ file: false }, 'Choisis une vidéo.'],
    [{ caption: '' }, 'Décris la vidéo : la légende est obligatoire.'],
    [{ rights: false }, "Confirme tes droits sur la vidéo et l'accord des personnes filmées."],
  ])('should tell a missing field (%o), keeping the input', async (missing, message) => {
    const { user, videos } = open();
    await screen.findByRole('heading', { level: 1, name: 'Ajouter une vidéo à Pop to Bird' });

    await fill(user, missing);
    await user.click(screen.getByRole('button', { name: 'Ajouter la vidéo' }));

    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(screen.getByLabelText('Crédit')).toHaveValue('Léa Martin');
    expect(videos.added).toEqual([]);
  });

  it('should tell AcroFunJam unreachable, keeping the input', async () => {
    const videos = new FakeTransitionVideos();
    videos.addAnswer.set(fail({ kind: 'unreachable' }));
    const { user } = open(videos);
    await screen.findByRole('heading', { level: 1, name: 'Ajouter une vidéo à Pop to Bird' });

    await fill(user);
    await user.click(screen.getByRole('button', { name: 'Ajouter la vidéo' }));

    expect(
      await screen.findByText(
        "La vidéo n'a pas pu être envoyée : impossible de joindre AcroFunJam. Vérifie ta connexion Internet, puis réessaie.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Légende')).toHaveValue('Pop to Bird, vue de côté');
  });
});
