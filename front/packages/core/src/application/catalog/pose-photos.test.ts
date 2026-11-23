import { describe, expect, it } from 'vitest';
import type { PosePhoto } from '../../domain/catalog/pose-photos';
import { fail, ok } from '../../domain/common/result';
import {
  addPosePhoto,
  choosePosePhotoAsMain,
  correctPosePhoto,
  examinePhoto,
  removePosePhoto,
  type AddPosePhotoError,
} from './pose-photos';
import type {
  PhotoFacts,
  PhotoInspector,
  PhotoReducer,
  PosePhotosFailure,
  PosePhotosGateway,
} from './PosePhotosGateway';

// Story 10 « Photos des poses » (ADR 0039): the use cases of the site, with a file type opaque to core (F = string here).

const mb = 1024 * 1024;
const added: PosePhoto = {
  id: 'photo-1',
  altText: 'Bird vue de profil',
  credit: 'Léa Martin',
  width: 1600,
  height: 1200,
  sources: { thumbnail: '/t', page: '/p', enlarged: '/e' },
};

const inspector = (facts: PhotoFacts): PhotoInspector<string> => ({ inspect: async () => facts });
const jpeg = (size: number, width = 1600, height = 1200): PhotoFacts => ({
  format: 'jpeg',
  size,
  dimensions: { width, height },
});

const gatewayAnswering = (answer: Awaited<ReturnType<PosePhotosGateway<string>['addPhoto']>>) => {
  const sent: Array<{
    poseId: string;
    file: string;
    altText: string;
    credit: string;
    rightsConfirmed: boolean;
  }> = [];
  const gateway: PosePhotosGateway<string> = {
    addPhoto: async (poseId, input, options) => {
      options.onProgress?.(0.5);
      sent.push({ poseId, ...input });
      return answer;
    },
    removePhoto: async () => ok(undefined),
    chooseMainPhoto: async () => ok(undefined),
    correctPhoto: async () => ok(added),
  };
  return { gateway, sent };
};

const reducer: PhotoReducer<string> = {
  reduce: async (file, target) => `${file}@${target.width}x${target.height}`,
};

const input = { altText: 'Bird vue de profil', credit: 'Léa Martin', rightsConfirmed: true };

describe('examinePhoto', () => {
  it('should tell what the site does with the chosen file, from what the browser found', async () => {
    expect(await examinePhoto(inspector(jpeg(12 * mb, 6000, 4000)), 'bird.jpg')).toEqual({
      facts: jpeg(12 * mb, 6000, 4000),
      plan: { kind: 'reduce', target: { width: 2400, height: 1600 } },
    });
  });
});

describe('addPosePhoto', () => {
  it('should send the photo with its texts, and pass the progress on', async () => {
    const { gateway, sent } = gatewayAnswering(ok(added));
    const progress: number[] = [];

    const result = await addPosePhoto(
      { inspector: inspector(jpeg(2 * mb)), reducer, gateway },
      'pose-bird',
      { file: 'bird.jpg', ...input },
      { onProgress: (p) => progress.push(p), signal: new AbortController().signal },
    );

    expect(result).toEqual(ok(added));
    expect(sent).toEqual([{ poseId: 'pose-bird', file: 'bird.jpg', ...input }]);
    expect(progress).toEqual([0.5]);
  });

  it('should reduce a photo over 10 MiB the browser can read before sending it', async () => {
    const { gateway, sent } = gatewayAnswering(ok(added));

    await addPosePhoto(
      {
        inspector: {
          inspect: async (file) => (file.includes('@') ? jpeg(3 * mb, 2400, 1600) : jpeg(12 * mb, 6000, 4000)),
        },
        reducer,
        gateway,
      },
      'pose-bird',
      { file: 'bird.jpg', ...input },
      {},
    );

    expect(sent[0]?.file).toBe('bird.jpg@2400x1600');
  });

  it('should send nothing and give every error of the form when the input is incomplete', async () => {
    const { gateway, sent } = gatewayAnswering(ok(added));

    const result = await addPosePhoto(
      { inspector: inspector(jpeg(2 * mb)), reducer, gateway },
      'pose-bird',
      { file: null, altText: '', credit: 'Léa Martin', rightsConfirmed: false },
      {},
    );

    expect(result).toEqual(
      fail({ kind: 'invalid-input', errors: { file: 'required', altText: 'required', rights: 'required' } }),
    );
    expect(sent).toEqual([]);
  });

  it('should send nothing when the file is refused', async () => {
    const { gateway, sent } = gatewayAnswering(ok(added));

    const result = await addPosePhoto(
      { inspector: inspector(jpeg(mb, 1200, 799)), reducer, gateway },
      'pose-bird',
      { file: 'small.jpg', ...input },
      {},
    );

    expect(result).toEqual(fail({ kind: 'file-refused', reason: 'too-small' }));
    expect(sent).toEqual([]);
  });

  it('should refuse a photo still too heavy once reduced', async () => {
    const { gateway } = gatewayAnswering(ok(added));
    const heavy: PhotoInspector<string> = {
      inspect: async (file) => (file.includes('@') ? jpeg(11 * mb, 2400, 1600) : jpeg(30 * mb, 9000, 6000)),
    };

    expect(
      await addPosePhoto(
        { inspector: heavy, reducer, gateway },
        'pose-bird',
        { file: 'huge.jpg', ...input },
        {},
      ),
    ).toEqual(fail({ kind: 'file-refused', reason: 'too-large' }));
  });

  it.each<[PosePhotosFailure, AddPosePhotoError]>([
    [{ kind: 'unauthenticated' }, { kind: 'session-expired' }],
    [{ kind: 'forbidden' }, { kind: 'role-withdrawn' }],
    [{ kind: 'not-found' }, { kind: 'not-found' }],
    [{ kind: 'limit-reached' }, { kind: 'limit-reached' }],
    [{ kind: 'too-large' }, { kind: 'file-refused', reason: 'too-large' }],
    [
      { kind: 'invalid', code: 'photo.too-small' },
      { kind: 'invalid', code: 'photo.too-small' },
    ],
    [{ kind: 'cancelled' }, { kind: 'cancelled' }],
    [{ kind: 'unreachable' }, { kind: 'unreachable' }],
    [{ kind: 'outdated' }, { kind: 'outdated' }],
  ])('should tell why the photo was not added (%j)', async (failure, error) => {
    const { gateway } = gatewayAnswering(fail(failure));

    expect(
      await addPosePhoto(
        { inspector: inspector(jpeg(mb)), reducer, gateway },
        'pose-bird',
        { file: 'b.jpg', ...input },
        {},
      ),
    ).toEqual(fail(error));
  });
});

describe('managing the photos', () => {
  const gateway = (failure: PosePhotosFailure | null): PosePhotosGateway<string> => ({
    addPhoto: async () => ok(added),
    removePhoto: async () => (failure ? fail(failure) : ok(undefined)),
    chooseMainPhoto: async () => (failure ? fail(failure) : ok(undefined)),
    correctPhoto: async () => (failure ? fail(failure) : ok(added)),
  });

  it('should remove a photo, or tell the session expired', async () => {
    expect(await removePosePhoto(gateway(null), 'pose-bird', 'photo-1')).toEqual(ok(undefined));
    expect(await removePosePhoto(gateway({ kind: 'unauthenticated' }), 'pose-bird', 'photo-1')).toEqual(
      fail({ kind: 'session-expired' }),
    );
  });

  it('should choose the main photo, or tell the photo was removed meanwhile', async () => {
    expect(await choosePosePhotoAsMain(gateway(null), 'pose-bird', 'photo-1')).toEqual(ok(undefined));
    expect(await choosePosePhotoAsMain(gateway({ kind: 'photo-not-found' }), 'pose-bird', 'photo-1')).toEqual(
      fail({ kind: 'photo-not-found' }),
    );
  });

  it('should check the texts before correcting a photo', async () => {
    expect(
      await correctPosePhoto(gateway(null), 'pose-bird', 'photo-1', { altText: ' ', credit: 'Léa Martin' }),
    ).toEqual(fail({ kind: 'invalid-input', errors: { altText: 'required' } }));
    expect(
      await correctPosePhoto(gateway({ kind: 'forbidden' }), 'pose-bird', 'photo-1', {
        altText: 'Bird',
        credit: 'Léa',
      }),
    ).toEqual(fail({ kind: 'role-withdrawn' }));
  });
});
