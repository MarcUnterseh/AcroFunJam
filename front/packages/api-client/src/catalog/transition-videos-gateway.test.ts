import { fail, ok } from '@acrofunjam/core';
import { describe, expect, it } from 'vitest';
import { createApiClient } from '../client';
import type { UploadRequest, UploadTransport } from './pose-photos-gateway';
import { createTransitionVideosGateway } from './transition-videos-gateway';

// Story 12 « Vidéos des transitions » (ADR 0041): the videos of a transition through the API.

const transitionId = 't-1';
const video = {
  id: 'video-1',
  caption: 'Pop to Bird, vue de côté',
  credit: 'Léa Martin',
  description: null,
  width: 720,
  height: 1280,
  durationMs: 12000,
  preparation: 'in-preparation',
  sources: null,
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

const file = new Blob(['video'], { type: 'video/mp4' });
const input = {
  file,
  caption: 'Pop to Bird, vue de côté',
  credit: 'Léa Martin',
  description: '',
  rightsConfirmed: true,
};

describe('createTransitionVideosGateway, adding a video', () => {
  it('should send the texts, then the file, in multipart to POST /catalog/transitions/{id}/videos, with the progress', async () => {
    const { send, requests } = transport({ status: 202, body: video });
    const gateway = createTransitionVideosGateway(apiAnswering(200), 'http://api.test', send);
    const progress: number[] = [];

    const result = await gateway.addVideo(transitionId, input, { onProgress: (p) => progress.push(p) });

    expect(result).toEqual(ok(video));
    expect(requests[0]!.url).toBe(`http://api.test/catalog/transitions/${transitionId}/videos`);
    expect([...requests[0]!.body.keys()]).toEqual([
      'caption',
      'credit',
      'description',
      'rightsConfirmed',
      'file',
    ]);
    expect(requests[0]!.body.get('rightsConfirmed')).toBe('true');
    expect(progress).toEqual([0.4]);
  });

  it.each([
    [{ status: 401 }, { kind: 'unauthenticated' }],
    [{ status: 403, body: { title: 'identity.capability-required' } }, { kind: 'forbidden' }],
    [{ status: 413, body: { title: 'video.too-large' } }, { kind: 'too-large' }],
    [{ status: 503 }, { kind: 'busy' }],
    [{ status: 404, body: { title: 'catalog.transition-not-found' } }, { kind: 'not-found' }],
    [{ status: 409, body: { title: 'catalog.video-limit-reached' } }, { kind: 'limit-reached' }],
    [
      { status: 400, body: { title: 'video.too-long', durationSeconds: 31 } },
      { kind: 'invalid', code: 'video.too-long', durationSeconds: 31 },
    ],
    [
      { status: 400, body: { title: 'video.caption-required' } },
      { kind: 'invalid', code: 'video.caption-required' },
    ],
    [{ status: 400, body: { title: 'something.new' } }, { kind: 'outdated' }],
  ] as const)('should tell the answer %o as %o', async (answer, failure) => {
    const { send } = transport(answer);
    const gateway = createTransitionVideosGateway(apiAnswering(200), 'http://api.test', send);

    expect(await gateway.addVideo(transitionId, input, {})).toEqual(fail(failure));
  });

  it('should tell a network failure and a cancellation', async () => {
    const network = createTransitionVideosGateway(
      apiAnswering(200),
      'http://api.test',
      transport('network').send,
    );
    const aborted = createTransitionVideosGateway(
      apiAnswering(200),
      'http://api.test',
      transport('aborted').send,
    );

    expect(await network.addVideo(transitionId, input, {})).toEqual(fail({ kind: 'unreachable' }));
    expect(await aborted.addVideo(transitionId, input, {})).toEqual(fail({ kind: 'cancelled' }));
  });
});

describe('createTransitionVideosGateway, managing the videos', () => {
  it('should list the videos of the transition', async () => {
    const requests: Request[] = [];
    const gateway = createTransitionVideosGateway(
      apiAnswering(200, { videos: [video] }, requests),
      'http://api.test',
    );

    expect(await gateway.listVideos(transitionId)).toEqual(ok([video]));
    expect(new URL(requests[0]!.url).pathname).toBe(`/catalog/transitions/${transitionId}/videos`);
  });

  it('should correct the texts of a video with PUT', async () => {
    const requests: Request[] = [];
    const gateway = createTransitionVideosGateway(apiAnswering(200, video, requests), 'http://api.test');
    const texts = { caption: 'Vue de face', credit: 'Léa Martin', description: '' };

    expect(await gateway.correctVideo(transitionId, 'video-1', texts)).toEqual(ok(video));
    expect(requests[0]!.method).toBe('PUT');
    expect(await requests[0]!.json()).toEqual(texts);
  });

  it('should remove a video with DELETE, and tell a video already removed', async () => {
    const requests: Request[] = [];
    const gateway = createTransitionVideosGateway(apiAnswering(204, undefined, requests), 'http://api.test');
    expect(await gateway.removeVideo(transitionId, 'video-1')).toEqual(ok(undefined));
    expect(requests[0]!.method).toBe('DELETE');

    const gone = createTransitionVideosGateway(
      apiAnswering(404, { title: 'catalog.video-not-found', status: 404 }),
      'http://api.test',
    );
    expect(await gone.removeVideo(transitionId, 'video-1')).toEqual(fail({ kind: 'video-not-found' }));
  });
});
