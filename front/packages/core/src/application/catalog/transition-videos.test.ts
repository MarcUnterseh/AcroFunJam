import { describe, expect, it } from 'vitest';
import type { TransitionVideo, VideoFacts } from '../../domain/catalog/transition-videos';
import { fail, ok, type Result } from '../../domain/common/result';
import {
  addTransitionVideo,
  correctTransitionVideo,
  examineVideo,
  readTransitionVideos,
  removeTransitionVideo,
} from './transition-videos';
import type {
  TransitionVideosFailure,
  TransitionVideosGateway,
  VideoInspector,
} from './TransitionVideosGateway';

// Story 12 « Vidéos des transitions » (ADR 0041): the use cases of the site, with a file type opaque to core (F = string).

const mb = 1024 * 1024;
const added: TransitionVideo = {
  id: 'video-1',
  caption: 'Pop to Bird, vue de côté',
  credit: 'Léa Martin',
  description: null,
  width: 720,
  height: 1280,
  durationMs: 12_000,
  preparation: 'in-preparation',
  sources: null,
};

const mp4 = (overrides: Partial<VideoFacts> = {}): VideoFacts => ({
  format: 'mp4',
  size: 20 * mb,
  durationMs: 12_000,
  dimensions: { width: 1080, height: 1920 },
  ...overrides,
});

const inspector = (facts: VideoFacts): VideoInspector<string> => ({ inspect: async () => facts });

const fakeGateway = (answer: Result<TransitionVideo, TransitionVideosFailure> = ok(added)) => {
  const sent: unknown[] = [];
  const gateway: TransitionVideosGateway<string> = {
    addVideo: async (transitionId, input, options) => {
      options.onProgress?.(0.5);
      sent.push({ transitionId, ...input });
      return answer;
    },
    listVideos: async (transitionId) => {
      sent.push({ listed: transitionId });
      return answer.ok ? ok([answer.value]) : answer;
    },
    correctVideo: async (transitionId, videoId, texts) => {
      sent.push({ transitionId, videoId, ...texts });
      return answer;
    },
    removeVideo: async (transitionId, videoId) => {
      sent.push({ transitionId, videoId });
      return answer.ok ? ok(undefined) : answer;
    },
  };
  return { gateway, sent };
};

const input = {
  caption: 'Pop to Bird, vue de côté',
  credit: 'Léa Martin',
  description: '',
  rightsConfirmed: true,
};

describe('examineVideo', () => {
  it('should tell what the site does with the chosen file, from what the browser found', async () => {
    expect(await examineVideo(inspector(mp4({ durationMs: 31_700 })), 'pop.mp4')).toEqual({
      facts: mp4({ durationMs: 31_700 }),
      plan: { kind: 'refuse', reason: 'too-long', seconds: 31 },
    });
  });
});

describe('addTransitionVideo', () => {
  it('should send the video with its texts, and pass the progress on', async () => {
    const { gateway, sent } = fakeGateway();
    const progress: number[] = [];

    const result = await addTransitionVideo(
      { inspector: inspector(mp4()), gateway },
      'transition-1',
      { ...input, file: 'pop.mp4', description: 'La base pousse.' },
      { onProgress: (value) => progress.push(value) },
    );

    expect(result).toEqual(ok(added));
    expect(sent).toEqual([
      { transitionId: 'transition-1', file: 'pop.mp4', ...input, description: 'La base pousse.' },
    ]);
    expect(progress).toEqual([0.5]);
  });

  it('should give every error of the form at once, without sending anything', async () => {
    const { gateway, sent } = fakeGateway();

    const result = await addTransitionVideo(
      { inspector: inspector(mp4()), gateway },
      'transition-1',
      { file: null, caption: ' ', credit: '', description: '', rightsConfirmed: false },
      {},
    );

    expect(result).toEqual(
      fail({
        kind: 'invalid-input',
        errors: { file: 'required', caption: 'required', credit: 'required', rights: 'required' },
      }),
    );
    expect(sent).toEqual([]);
  });

  it('should refuse a file the site already knows AcroFunJam does not accept, without sending it', async () => {
    const { gateway, sent } = fakeGateway();

    const result = await addTransitionVideo(
      { inspector: inspector(mp4({ format: null })), gateway },
      'transition-1',
      { ...input, file: 'document.pdf' },
      {},
    );

    expect(result).toEqual(fail({ kind: 'file-refused', reason: 'format' }));
    expect(sent).toEqual([]);
  });

  it.each([
    [{ kind: 'unauthenticated' }, { kind: 'session-expired' }],
    [{ kind: 'forbidden' }, { kind: 'role-withdrawn' }],
    [{ kind: 'too-large' }, { kind: 'file-refused', reason: 'too-large' }],
    [
      { kind: 'invalid', code: 'video.too-long', durationSeconds: 31 },
      { kind: 'file-refused', reason: 'too-long', seconds: 31 },
    ],
    [
      { kind: 'invalid', code: 'video.format-not-accepted' },
      { kind: 'file-refused', reason: 'format' },
    ],
    [
      { kind: 'invalid', code: 'video.too-short' },
      { kind: 'file-refused', reason: 'too-short' },
    ],
    [
      { kind: 'invalid', code: 'video.too-small' },
      { kind: 'file-refused', reason: 'too-small' },
    ],
    [
      { kind: 'invalid', code: 'video.credit-not-an-author' },
      { kind: 'invalid', code: 'video.credit-not-an-author' },
    ],
    [{ kind: 'busy' }, { kind: 'busy' }],
    [{ kind: 'unreachable' }, { kind: 'unreachable' }],
  ] as const)('should tell %o of the API as %o', async (failure, error) => {
    const { gateway } = fakeGateway(fail(failure));

    const result = await addTransitionVideo(
      { inspector: inspector(mp4()), gateway },
      'transition-1',
      { ...input, file: 'pop.mp4' },
      {},
    );

    expect(result).toEqual(fail(error));
  });
});

describe('correctTransitionVideo', () => {
  it('should send the caption, the credit and the description', async () => {
    const { gateway, sent } = fakeGateway(ok({ ...added, caption: 'Vue de face' }));
    const texts = { caption: 'Vue de face', credit: 'Léa Martin', description: '' };

    const result = await correctTransitionVideo(gateway, 'transition-1', 'video-1', texts);

    expect(result).toEqual(ok({ ...added, caption: 'Vue de face' }));
    expect(sent).toEqual([{ transitionId: 'transition-1', videoId: 'video-1', ...texts }]);
  });

  it('should check the texts with the rules of an addition, without sending them', async () => {
    const { gateway, sent } = fakeGateway();

    const result = await correctTransitionVideo(gateway, 'transition-1', 'video-1', {
      caption: '   ',
      credit: 'Léa Martin',
      description: 'a'.repeat(301),
    });

    expect(result).toEqual(
      fail({ kind: 'invalid-input', errors: { caption: 'required', description: 'too-long' } }),
    );
    expect(sent).toEqual([]);
  });
});

describe('removeTransitionVideo', () => {
  it('should remove the video, and tell a removal already done', async () => {
    const { gateway, sent } = fakeGateway();
    expect(await removeTransitionVideo(gateway, 'transition-1', 'video-1')).toEqual(ok(undefined));
    expect(sent).toEqual([{ transitionId: 'transition-1', videoId: 'video-1' }]);

    const gone = fakeGateway(fail({ kind: 'video-not-found' }));
    expect(await removeTransitionVideo(gone.gateway, 'transition-1', 'video-1')).toEqual(
      fail({ kind: 'video-not-found' }),
    );
  });
});

describe('readTransitionVideos', () => {
  it('should read the videos of the transition, in every preparation', async () => {
    const { gateway, sent } = fakeGateway();

    expect(await readTransitionVideos(gateway, 'transition-1')).toEqual(ok([added]));
    expect(sent).toEqual([{ listed: 'transition-1' }]);
  });
});
