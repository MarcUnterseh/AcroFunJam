import { fail, ok, type LinkedTransition, type PosePage, type TransitionVideo } from '@acrofunjam/core';
import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  aTransitionVideo,
  FakeAuthGateway,
  FakePosePageGateway,
  FakeTransitionVideos,
  renderSite,
} from '../test/site-harness';

// Story 12 « Vidéos des transitions » (rangee-videos.md, bloc-preparation-video.md; V22, UX-52, UX-59): the videos of a
// transition managed by a validator from the page of a pose.

const popToBird = (videos: readonly TransitionVideo[] = []): LinkedTransition => ({
  id: 't-pop-to-bird',
  otherPose: { id: 'pose-bird', name: 'Bird' },
  name: 'Pop to Bird',
  baseDifficulty: 'intermediate',
  flyerDifficulty: 'intermediate',
  description: null,
  tags: [],
  videos,
});

const throne = (videos: readonly TransitionVideo[] = []): PosePage => ({
  id: 'pose-throne',
  name: 'Throne',
  baseDifficulty: 'discovery',
  flyerDifficulty: 'beginner',
  canStartFlow: true,
  canEndFlow: true,
  transitionsFrom: [popToBird(videos)],
  transitionsTo: [],
  tags: [],
  pendingRevision: false,
  photos: [],
});

const account = (capabilities: string[]) => {
  const gateway = new FakeAuthGateway();
  gateway.account = { email: 'bruno@example.org', capabilities: capabilities as never };
  return gateway;
};
const validator = () =>
  account(['propose', 'validate-proposals', 'manage-tags', 'manage-photos', 'manage-videos']);

const open = ({
  page = throne(),
  after,
  gateway = validator(),
  videos = new FakeTransitionVideos(),
}: { page?: PosePage; after?: PosePage; gateway?: FakeAuthGateway; videos?: FakeTransitionVideos } = {}) => {
  const posePage = new FakePosePageGateway(ok(page), ok(after ?? page));
  const site = renderSite('/poses/pose-throne', { posePage, gateway, videos });
  return { ...site, posePage, user: userEvent.setup() };
};

const transition = async () =>
  (await screen.findByRole('heading', { level: 3, name: 'Pop to Bird' })).closest('li') as HTMLElement;

const front = aTransitionVideo({ id: 'v-front', caption: 'Vue de face' });
const side = aTransitionVideo({
  id: 'v-side',
  caption: 'Vue de côté',
  preparation: 'in-preparation',
  sources: null,
});

afterEach(() => vi.useRealTimers());

describe('the invitation to add a video', () => {
  it('should call an unnamed transition « la transition de … vers … » in the invitation and the count', async () => {
    const unnamed = { ...popToBird([front]), name: null };
    open({ page: { ...throne(), transitionsFrom: [unnamed] } });

    expect(
      await screen.findByRole('link', { name: 'Ajouter une vidéo à la transition de Throne vers Bird' }),
    ).toBeInTheDocument();
    expect(screen.getByText('de la transition de Throne vers Bird')).toBeInTheDocument();
  });

  it('should invite a validator to add a video to a transition without video, without a count', async () => {
    open();

    const item = await transition();
    const link = await within(item).findByRole('link', { name: 'Ajouter une vidéo à Pop to Bird' });
    expect(link).toHaveAttribute('href', '/poses/pose-throne/transitions/t-pop-to-bird/ajouter-une-video');
    expect(within(item).queryByText(/vidéo sur 3/)).toBeNull();
  });

  it('should count the videos of the transition out of 3, in preparation included', async () => {
    open({ page: throne([front, side]) });

    expect(await within(await transition()).findByText('2 vidéos sur 3')).toBeInTheDocument();
  });

  it('should say the maximum instead of the invitation at 3 videos', async () => {
    open({ page: throne([front, side, aTransitionVideo({ id: 'v3', caption: 'Au ralenti' })]) });

    const item = await transition();
    expect(
      await within(item).findByText(
        'Pop to Bird a déjà 3 vidéos, le maximum. Retire une vidéo pour en ajouter une autre.',
      ),
    ).toBeInTheDocument();
    expect(within(item).queryByRole('link', { name: /^Ajouter une vidéo/ })).toBeNull();
  });

  it('should not invite a user', async () => {
    open({ gateway: account(['propose']) });

    await screen.findByRole('link', { name: 'Proposer une modification' });
    expect(screen.queryByRole('link', { name: /^Ajouter une vidéo/ })).toBeNull();
  });
});

describe('the preparation of the videos', () => {
  it('should mark a video in preparation, without a button « Lire »', async () => {
    open({ page: throne([front, side]) });

    const item = await transition();
    expect(await within(item).findByText('En préparation')).toBeInTheDocument();
    expect(within(item).queryByRole('button', { name: /^Lire Vue de côté/ })).toBeNull();
    expect(within(item).getByRole('button', { name: /^Lire Vue de face/ })).toBeInTheDocument();
  });

  it('should mark a video that could not be prepared, and tell what to do under the row', async () => {
    open({ page: throne([{ ...side, preparation: 'failed' }]) });

    const item = await transition();
    expect(await within(item).findByText('Impossible à préparer')).toBeInTheDocument();
    expect(
      within(item).getByText(
        /^La vidéo « ?Vue de côté ?» n'a pas pu être préparée\. Retire.la, puis envoie.la de nouveau ou choisis-en une autre\.$/,
      ),
    ).toBeInTheDocument();
    expect(within(item).getByRole('button', { name: 'Retirer Vue de côté' })).toBeInTheDocument();
  });

  it('should read the videos again every 5 seconds while one is being prepared, and the page once it is ready', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const videos = new FakeTransitionVideos();
    videos.listAnswer.set(ok([front, { ...side, preparation: 'ready', sources: front.sources }]));
    const { posePage } = open({ page: throne([front, side]), videos });
    await transition();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5_000);
    });

    await waitFor(() => expect(videos.listed).toEqual(['t-pop-to-bird']));
    await waitFor(() => expect(posePage.read).toHaveLength(2));
  });

  it('should tell, after 15 minutes without the end of a preparation, to reload the page later (UX-52)', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const videos = new FakeTransitionVideos();
    videos.listAnswer.set(ok([front, side]));
    open({ page: throne([front, side]), videos });
    const item = await transition();
    const message =
      'La préparation prend plus de temps que prévu. Recharge la page plus tard pour voir si la vidéo est prête.';
    expect(within(item).queryByText(message)).toBeNull();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(15 * 60_000 + 5_000);
    });

    expect(await within(item).findByText(message)).toBeInTheDocument();
    const read = videos.listed.length;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });
    expect(videos.listed).toHaveLength(read);
  });
});

describe('managing a video', () => {
  it('should modify the caption, the credit and the description in place', async () => {
    const videos = new FakeTransitionVideos();
    const { user } = open({ page: throne([front]), videos });
    const item = await transition();

    await user.click(within(item).getByRole('button', { name: 'Modifier Vue de face' }));
    const zone = within(item).getByRole('group', { name: 'Modifier la vidéo' });
    expect(within(zone).getByRole('textbox', { name: 'Légende' })).toHaveValue('Vue de face');
    await user.clear(within(zone).getByRole('textbox', { name: 'Légende' }));
    await user.type(within(zone).getByRole('textbox', { name: 'Légende' }), 'Pop to Bird, de face');
    await user.type(
      within(zone).getByRole('textbox', { name: 'Description de la vidéo (facultative)' }),
      'La base pousse.',
    );
    expect(within(zone).getByText('(facultative)', { selector: 'label span' })).toHaveClass(
      'field__optional',
    );
    await user.click(within(zone).getByRole('button', { name: 'Enregistrer la vidéo' }));

    await waitFor(() =>
      expect(videos.corrected).toEqual([
        {
          transitionId: 't-pop-to-bird',
          videoId: 'v-front',
          caption: 'Pop to Bird, de face',
          credit: 'Léa Martin',
          description: 'La base pousse.',
        },
      ]),
    );
    await waitFor(() => expect(within(item).queryByRole('group', { name: 'Modifier la vidéo' })).toBeNull());
  });

  it('should refuse an empty caption without sending it', async () => {
    const videos = new FakeTransitionVideos();
    const { user } = open({ page: throne([front]), videos });
    const item = await transition();

    await user.click(within(item).getByRole('button', { name: 'Modifier Vue de face' }));
    await user.clear(within(item).getByRole('textbox', { name: 'Légende' }));
    await user.click(within(item).getByRole('button', { name: 'Enregistrer la vidéo' }));

    expect(within(item).getByText('Décris la vidéo : la légende est obligatoire.')).toBeInTheDocument();
    expect(videos.corrected).toEqual([]);
  });

  it('should remove a video after a confirmation saying what it changes', async () => {
    const videos = new FakeTransitionVideos();
    const { user } = open({ page: throne([front]), after: throne([]), videos });
    const item = await transition();

    await user.click(within(item).getByRole('button', { name: 'Retirer Vue de face' }));
    const zone = within(item).getByRole('group', { name: 'Retirer cette vidéo de Pop to Bird\u202f?' });
    expect(
      within(zone).getByText("Pop to Bird n'aura plus de vidéo, et celle-ci ne pourra pas être récupérée."),
    ).toBeInTheDocument();
    await user.click(within(zone).getByRole('button', { name: 'Retirer la vidéo' }));

    await waitFor(() =>
      expect(videos.removed).toEqual([{ transitionId: 't-pop-to-bird', videoId: 'v-front' }]),
    );
    await waitFor(() => expect(within(item).queryByText('Vue de face')).toBeNull());
  });

  it('should give the focus to the title « Vidéos » once a video is removed, when others remain', async () => {
    const other = aTransitionVideo({ id: 'v-other', caption: 'Au ralenti' });
    const { user } = open({ page: throne([front, other]), after: throne([other]) });
    const item = await transition();

    await user.click(within(item).getByRole('button', { name: 'Retirer Vue de face' }));
    await user.click(within(item).getByRole('button', { name: 'Retirer la vidéo' }));

    await waitFor(() => expect(within(item).queryByText('Vue de face')).toBeNull());
    await waitFor(() => expect(within(item).getByRole('heading', { level: 4 })).toHaveFocus());
    expect(within(item).getByRole('heading', { level: 4 })).toHaveAccessibleName('Vidéos de Pop to Bird');
  });

  it('should give the focus to the title of the transition once its last video is removed', async () => {
    const { user } = open({ page: throne([front]), after: throne([]) });
    const item = await transition();

    await user.click(within(item).getByRole('button', { name: 'Retirer Vue de face' }));
    await user.click(within(item).getByRole('button', { name: 'Retirer la vidéo' }));

    await waitFor(() =>
      expect(within(item).getByRole('heading', { level: 3, name: 'Pop to Bird' })).toHaveFocus(),
    );
  });

  it('should tell AcroFunJam unreachable when removing, without speaking of a sending', async () => {
    const videos = new FakeTransitionVideos();
    videos.answer.set(fail({ kind: 'unreachable' }));
    const { user } = open({ page: throne([front]), videos });
    const item = await transition();

    await user.click(within(item).getByRole('button', { name: 'Retirer Vue de face' }));
    await user.click(within(item).getByRole('button', { name: 'Retirer la vidéo' }));

    expect(
      await within(item).findByText(
        'Impossible de joindre AcroFunJam. Vérifie ta connexion Internet, puis réessaie.',
      ),
    ).toBeInTheDocument();
  });

  it('should tell a credit that names no one, inviting to remove the video', async () => {
    const videos = new FakeTransitionVideos();
    videos.answer.set(fail({ kind: 'invalid', code: 'video.credit-not-an-author' }));
    const { user } = open({ page: throne([front]), videos });
    const item = await transition();

    await user.click(within(item).getByRole('button', { name: 'Modifier Vue de face' }));
    await user.click(within(item).getByRole('button', { name: 'Enregistrer la vidéo' }));

    expect(
      await within(item).findByText(
        'Le crédit doit nommer à qui appartient la vidéo. Si tu ne sais pas à qui elle appartient, retire cette vidéo.',
      ),
    ).toBeInTheDocument();
    expect(within(item).getByRole('textbox', { name: 'Crédit' })).toHaveFocus();
  });
});
