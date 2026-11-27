import { ok, type LinkedTransition, type PosePage, type TransitionVideo } from '@acrofunjam/core';
import { fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FakePosePageGateway, renderSite } from '../test/site-harness';

// Story 12 « Vidéos des transitions » (docs/design/ecrans/12-videos-des-transitions.md, rangee-videos.md,
// lecteur-video.md; V18 to V20, V23): the videos of the transitions on the page of a pose, for a visitor.

export const aVideo = (overrides: Partial<TransitionVideo> = {}): TransitionVideo => {
  const id = overrides.id ?? 'video-1';
  return {
    id,
    caption: 'Pop to Bird, démonstration de face',
    credit: 'Léa Martin',
    description: null,
    width: 720,
    height: 1280,
    durationMs: 12_400,
    preparation: 'ready',
    sources: { video: `/catalog/videos/${id}/video`, poster: `/catalog/videos/${id}/poster` },
    ...overrides,
  };
};

const front = aVideo();
const tutorial = aVideo({
  id: 'video-2',
  caption: 'Pop to Bird, tutoriel',
  credit: 'Hugo Bernard',
  description: "La base pousse les pieds du flyer, qui passe de l'assise à l'horizontale, face au sol.",
  durationMs: 20_000,
});

export const popToBird = (videos: readonly TransitionVideo[] = [front, tutorial]): LinkedTransition => ({
  id: 't-pop-to-bird',
  otherPose: { id: 'pose-bird', name: 'Bird' },
  name: 'Pop to Bird',
  baseDifficulty: 'intermediate',
  flyerDifficulty: 'intermediate',
  description: 'Depuis Throne, la base pousse.',
  tags: [],
  videos,
});

export const throne = (transitionsFrom: readonly LinkedTransition[] = [popToBird()]): PosePage => ({
  id: 'pose-throne',
  name: 'Throne',
  baseDifficulty: 'discovery',
  flyerDifficulty: 'beginner',
  canStartFlow: true,
  canEndFlow: true,
  transitionsFrom,
  transitionsTo: [],
  tags: [],
  pendingRevision: false,
  photos: [],
});

const open = (page = throne()) => {
  renderSite('/poses/pose-throne', { posePage: new FakePosePageGateway(ok(page), ok(page)) });
  return userEvent.setup();
};

const transition = async () =>
  (await screen.findByRole('heading', { level: 3, name: 'Pop to Bird' })).closest('li') as HTMLElement;

const cell = (caption: string) => screen.getByText(caption, { selector: 'p' }).closest('li') as HTMLElement;

afterEach(() => vi.unstubAllGlobals());

describe('the videos of a transition, for a visitor', () => {
  it('should present the videos in a group titled « Vidéos », after the reminder of safety', async () => {
    open();

    const item = await transition();
    const group = within(item).getByRole('group', { name: 'Vidéos de Pop to Bird' });
    const reminder = within(group).getByText(
      'Une vidéo montre une façon de faire ; elle ne remplace ni un cours ni un spotter.',
    );
    const list = within(group).getByRole('list');
    expect(reminder.compareDocumentPosition(list) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(list).getAllByRole('listitem')).toHaveLength(2);
  });

  it('should present each video by its poster, its button « Lire », its caption and its credit, in order', async () => {
    open();
    await transition();

    const first = cell('Pop to Bird, démonstration de face');
    expect(
      within(first).getByRole('button', { name: 'Lire Pop to Bird, démonstration de face (12 secondes)' }),
    );
    expect(first.querySelector('img')).toHaveAttribute('src', '/catalog/videos/video-1/poster');
    expect(first.querySelector('img')).toHaveAttribute('alt', '');
    expect(within(first).getByText('0:12')).toBeInTheDocument();
    expect(within(first).getByText('Vidéo : Léa Martin')).toBeInTheDocument();
    expect(first.querySelector('video')).toBeNull();
    expect(
      first.compareDocumentPosition(cell('Pop to Bird, tutoriel')) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('should present the description in a fold « Description », completed by the caption, describing the player', async () => {
    open();
    await transition();

    const withDescription = cell('Pop to Bird, tutoriel');
    const summary = withDescription.querySelector('summary')!;
    expect(summary).toHaveTextContent(/^Description de la vidéo Pop to Bird, tutoriel$/);
    expect(within(summary).getByText('de la vidéo Pop to Bird, tutoriel')).toHaveClass('visually-hidden');
    expect(
      within(withDescription).getByRole('button', { name: /^Lire Pop to Bird, tutoriel/ }),
    ).toHaveAccessibleDescription(tutorial.description!);
    expect(cell('Pop to Bird, démonstration de face').querySelector('summary')).toBeNull();
  });

  it('should present nothing for a transition without video', async () => {
    open(throne([popToBird([])]));

    const item = await transition();
    expect(within(item).queryByRole('group', { name: /^Vidéos/ })).toBeNull();
    expect(within(item).queryByText(/ne remplace ni un cours/)).toBeNull();
  });

  it('should play a video launched, at its place, in a loop, muted, named by its caption and described', async () => {
    const user = open();
    await transition();

    await user.click(screen.getByRole('button', { name: /^Lire Pop to Bird, tutoriel/ }));

    const video = cell('Pop to Bird, tutoriel').querySelector('video')!;
    expect(video).toHaveAttribute('src', '/catalog/videos/video-2/video');
    expect(video.muted).toBe(true);
    expect(video.loop).toBe(true);
    expect(video).toHaveAttribute('playsinline');
    expect(video).toHaveAttribute('controls');
    expect(video).toHaveAccessibleName('Pop to Bird, tutoriel');
    expect(video).toHaveAccessibleDescription(tutorial.description!);
    expect(
      within(cell('Pop to Bird, tutoriel')).getByRole('button', {
        name: 'Fermer la vidéo Pop to Bird, tutoriel',
      }),
    );
  });

  it('should play a launched video once only when the person prefers reduced motion (UX-51)', async () => {
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('reduce'), media: query }));
    const user = open();
    await transition();

    await user.click(screen.getByRole('button', { name: /^Lire Pop to Bird, tutoriel/ }));

    expect(cell('Pop to Bird, tutoriel').querySelector('video')!.loop).toBe(false);
  });

  it('should bring back the poster of a video when another one is launched (UX-54)', async () => {
    const user = open();
    await transition();

    await user.click(screen.getByRole('button', { name: /^Lire Pop to Bird, démonstration/ }));
    await user.click(screen.getByRole('button', { name: /^Lire Pop to Bird, tutoriel/ }));

    expect(cell('Pop to Bird, démonstration de face').querySelector('video')).toBeNull();
    expect(cell('Pop to Bird, tutoriel').querySelector('video')).not.toBeNull();
  });

  it('should give the focus to the player launched by the person', async () => {
    const user = open();
    await transition();

    await user.click(screen.getByRole('button', { name: /^Lire Pop to Bird, tutoriel/ }));

    expect(cell('Pop to Bird, tutoriel').querySelector('video')).toHaveFocus();
  });

  it('should tell a video that could not be played, and give the focus to the player again with « Réessayer »', async () => {
    const user = open();
    await transition();
    await user.click(screen.getByRole('button', { name: /^Lire Pop to Bird, tutoriel/ }));

    fireEvent.error(cell('Pop to Bird, tutoriel').querySelector('video')!);
    expect(
      within(cell('Pop to Bird, tutoriel')).getByText(
        "La vidéo n'a pas pu être lue. Vérifie ta connexion Internet, puis réessaie.",
      ),
    ).toBeInTheDocument();
    await user.click(within(cell('Pop to Bird, tutoriel')).getByRole('button', { name: 'Réessayer' }));

    expect(cell('Pop to Bird, tutoriel').querySelector('video')).toHaveFocus();
  });

  it('should bring back the poster with « Fermer la vidéo »', async () => {
    const user = open();
    await transition();

    await user.click(screen.getByRole('button', { name: /^Lire Pop to Bird, tutoriel/ }));
    await user.click(screen.getByRole('button', { name: 'Fermer la vidéo Pop to Bird, tutoriel' }));

    expect(cell('Pop to Bird, tutoriel').querySelector('video')).toBeNull();
    expect(screen.getByRole('button', { name: /^Lire Pop to Bird, tutoriel/ })).toHaveFocus();
  });
});
