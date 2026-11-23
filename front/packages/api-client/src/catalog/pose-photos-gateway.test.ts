import { fail, ok } from '@acrofunjam/core';
import { describe, expect, it } from 'vitest';
import { createApiClient } from '../client';
import { createPosePhotosGateway, type UploadRequest, type UploadTransport } from './pose-photos-gateway';

// Story 10 « Photos des poses » (ADR 0039): the photos of a pose through the API, the addition with its progress.

const birdId = '9a1f0b9c-1c0e-4b0b-b6a0-27a2a1f7c3d2';
const photo = {
  id: 'photo-1',
  altText: 'Bird vue de profil',
  credit: 'Léa Martin',
  width: 1600,
  height: 1200,
  sources: { thumbnail: '/t', page: '/p', enlarged: '/e' },
};

const transport = (answer: { status: number; body?: unknown } | 'network' | 'aborted') => {
  const requests: UploadRequest[] = [];
  const send: UploadTransport = async (request) => {
    requests.push(request);
    request.onProgress?.(0.4);
    if (answer === 'network') throw new TypeError('Failed to fetch');
    if (answer === 'aborted') throw new DOMException('Aborted', 'AbortError');
    return { status: answer.status, body: answer.body };
  };
  return { send, requests };
};

const apiAnswering = (status: number, body?: unknown, requests: Request[] = []) =>
  createApiClient({
    baseUrl: 'http://api.test',
    fetch: async (request) => {
      requests.push(request);
      return new Response(body === undefined ? null : JSON.stringify(body), {
        status,
        headers: { 'Content-Type': status >= 400 ? 'application/problem+json' : 'application/json' },
      });
    },
  });

const file = new Blob(['photo'], { type: 'image/jpeg' });
const input = { file, altText: 'Bird vue de profil', credit: 'Léa Martin', rightsConfirmed: true };

describe('createPosePhotosGateway, adding a photo', () => {
  it('should send the file and its texts in multipart to POST /catalog/poses/{id}/photos, with the progress', async () => {
    const { send, requests } = transport({ status: 201, body: photo });
    const gateway = createPosePhotosGateway(apiAnswering(200), 'http://api.test', send);
    const progress: number[] = [];

    const result = await gateway.addPhoto(birdId, input, { onProgress: (p) => progress.push(p) });

    expect(result).toEqual(ok(photo));
    expect(requests[0]!.url).toBe(`http://api.test/catalog/poses/${birdId}/photos`);
    const body = requests[0]!.body;
    expect(body.get('altText')).toBe('Bird vue de profil');
    expect(body.get('credit')).toBe('Léa Martin');
    expect(body.get('rightsConfirmed')).toBe('true');
    expect(body.get('file')).toBeInstanceOf(Blob);
    expect(progress).toEqual([0.4]);
  });

  it.each([
    [401, undefined, { kind: 'unauthenticated' }],
    [403, { title: 'identity.capability-required' }, { kind: 'forbidden' }],
    [404, { title: 'catalog.pose-not-found' }, { kind: 'not-found' }],
    [409, { title: 'catalog.photo-limit-reached' }, { kind: 'limit-reached' }],
    [413, { title: 'photo.too-large' }, { kind: 'too-large' }],
    [413, undefined, { kind: 'too-large' }],
    [400, { title: 'photo.too-small' }, { kind: 'invalid', code: 'photo.too-small' }],
    [500, undefined, { kind: 'unreachable' }],
    [418, { title: 'teapot' }, { kind: 'outdated' }],
  ])('should tell why the API refused (%d %j)', async (status, problem, failure) => {
    const gateway = createPosePhotosGateway(
      apiAnswering(200),
      'http://api.test',
      transport({ status, body: problem }).send,
    );

    expect(await gateway.addPhoto(birdId, input, {})).toEqual(fail(failure));
  });

  it('should report a cancelled sending, and a network failure as unreachable', async () => {
    expect(
      await createPosePhotosGateway(apiAnswering(200), 'http://api.test', transport('aborted').send).addPhoto(
        birdId,
        input,
        {},
      ),
    ).toEqual(fail({ kind: 'cancelled' }));
    expect(
      await createPosePhotosGateway(apiAnswering(200), 'http://api.test', transport('network').send).addPhoto(
        birdId,
        input,
        {},
      ),
    ).toEqual(fail({ kind: 'unreachable' }));
  });

  it('should report an answer it cannot read as an outdated site', async () => {
    const gateway = createPosePhotosGateway(
      apiAnswering(200),
      'http://api.test',
      transport({ status: 201, body: { id: 1 } }).send,
    );

    expect(await gateway.addPhoto(birdId, input, {})).toEqual(fail({ kind: 'outdated' }));
  });
});

describe('createPosePhotosGateway, managing the photos', () => {
  const unused = transport({ status: 500 }).send;

  it('should remove a photo with DELETE', async () => {
    const requests: Request[] = [];
    const gateway = createPosePhotosGateway(
      apiAnswering(204, undefined, requests),
      'http://api.test',
      unused,
    );

    expect(await gateway.removePhoto(birdId, 'photo-1')).toEqual(ok(undefined));
    expect(requests[0]!.method).toBe('DELETE');
    expect(new URL(requests[0]!.url).pathname).toBe(`/catalog/poses/${birdId}/photos/photo-1`);
  });

  it('should choose the main photo with PUT .../photos/main', async () => {
    const requests: Request[] = [];
    const gateway = createPosePhotosGateway(
      apiAnswering(204, undefined, requests),
      'http://api.test',
      unused,
    );

    expect(await gateway.chooseMainPhoto(birdId, 'photo-1')).toEqual(ok(undefined));
    expect(new URL(requests[0]!.url).pathname).toBe(`/catalog/poses/${birdId}/photos/main`);
    expect(await requests[0]!.json()).toEqual({ photoId: 'photo-1' });
  });

  it('should correct the texts of a photo with PUT, and read the corrected photo', async () => {
    const requests: Request[] = [];
    const gateway = createPosePhotosGateway(apiAnswering(200, photo, requests), 'http://api.test', unused);

    expect(
      await gateway.correctPhoto(birdId, 'photo-1', { altText: 'Bird vue de profil', credit: 'Léa Martin' }),
    ).toEqual(ok(photo));
    expect(await requests[0]!.json()).toEqual({ altText: 'Bird vue de profil', credit: 'Léa Martin' });
  });

  it('should report a photo removed meanwhile', async () => {
    const gateway = createPosePhotosGateway(
      apiAnswering(404, { title: 'catalog.photo-not-found' }),
      'http://api.test',
      unused,
    );

    expect(await gateway.removePhoto(birdId, 'photo-1')).toEqual(fail({ kind: 'photo-not-found' }));
  });
});
