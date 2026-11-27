import {
  fail,
  ok,
  type AddVideoInput,
  type Result,
  type TransitionVideo,
  type TransitionVideosFailure,
  type TransitionVideosGateway,
} from '@acrofunjam/core';
import type { ApiClient } from '../client';
import { xhrUploadTransport, type UploadTransport } from './pose-photos-gateway';
import { toTransitionVideo, toTransitionVideos } from './video-reading';

// Story 12 « Vidéos des transitions » (ADR 0041). The addition goes through the upload transport of the photos
// (XMLHttpRequest in the browser, for the progress); the other calls go through openapi-fetch.

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

/** The business code of a ProblemDetails is its title (ADR 0007). */
const codeOf = (problem: unknown): string =>
  isRecord(problem) && typeof problem['title'] === 'string' ? problem['title'] : '';

const failureOf = (status: number, problem: unknown): TransitionVideosFailure => {
  const code = codeOf(problem);
  if (status === 401) return { kind: 'unauthenticated' };
  if (status === 403) return { kind: 'forbidden' };
  if (status === 413) return { kind: 'too-large' };
  if (status === 503) return { kind: 'busy' };
  if (code === 'catalog.transition-not-found') return { kind: 'not-found' };
  if (code === 'catalog.video-not-found') return { kind: 'video-not-found' };
  if (code === 'catalog.video-limit-reached') return { kind: 'limit-reached' };
  if (status === 400 && code.startsWith('video.')) {
    const seconds = isRecord(problem) ? problem['durationSeconds'] : undefined;
    return typeof seconds === 'number'
      ? { kind: 'invalid', code, durationSeconds: seconds }
      : { kind: 'invalid', code };
  }
  if (status >= 500) return { kind: 'unreachable' };
  // A refusal the site does not know: the API is newer than the site, which must be reloaded.
  return { kind: 'outdated' };
};

const isAbort = (error: unknown) => error instanceof DOMException && error.name === 'AbortError';

/** HTTP adapter of the TransitionVideosGateway port of @acrofunjam/core, for a file of the browser (a Blob). */
export const createTransitionVideosGateway = (
  client: ApiClient,
  baseUrl: string,
  upload: UploadTransport = xhrUploadTransport,
): TransitionVideosGateway<Blob> => ({
  async addVideo(
    transitionId,
    input: AddVideoInput<Blob>,
    options,
  ): Promise<Result<TransitionVideo, TransitionVideosFailure>> {
    // The texts first, then the file: the API reads them before receiving the whole file (ADR 0041).
    const body = new FormData();
    body.append('caption', input.caption);
    body.append('credit', input.credit);
    body.append('description', input.description);
    body.append('rightsConfirmed', String(input.rightsConfirmed));
    body.append('file', input.file, input.file instanceof File ? input.file.name : 'video.mp4');
    try {
      const answer = await upload({
        url: `${baseUrl}/catalog/transitions/${encodeURIComponent(transitionId)}/videos`,
        body,
        ...(options.onProgress ? { onProgress: options.onProgress } : {}),
        ...(options.signal ? { signal: options.signal } : {}),
      });
      if (answer.status !== 202) return fail(failureOf(answer.status, answer.body));
      const video = toTransitionVideo(answer.body);
      return video ? ok(video) : fail({ kind: 'outdated' });
    } catch (error) {
      return fail(isAbort(error) ? { kind: 'cancelled' } : { kind: 'unreachable' });
    }
  },

  async listVideos(transitionId) {
    try {
      const { data, error, response } = await client.GET('/catalog/transitions/{transitionId}/videos', {
        params: { path: { transitionId } },
      });
      if (!response.ok) return fail(failureOf(response.status, error));
      const videos = isRecord(data) ? toTransitionVideos(data['videos']) : null;
      return videos ? ok(videos) : fail({ kind: 'outdated' });
    } catch {
      return fail({ kind: 'unreachable' });
    }
  },

  async correctVideo(transitionId, videoId, texts) {
    try {
      const { data, error, response } = await client.PUT(
        '/catalog/transitions/{transitionId}/videos/{videoId}',
        {
          params: { path: { transitionId, videoId } },
          body: texts,
        },
      );
      if (!response.ok) return fail(failureOf(response.status, error));
      const video = toTransitionVideo(data);
      return video ? ok(video) : fail({ kind: 'outdated' });
    } catch {
      return fail({ kind: 'unreachable' });
    }
  },

  async removeVideo(transitionId, videoId) {
    try {
      const { error, response } = await client.DELETE(
        '/catalog/transitions/{transitionId}/videos/{videoId}',
        {
          params: { path: { transitionId, videoId } },
        },
      );
      return response.ok ? ok(undefined) : fail(failureOf(response.status, error));
    } catch {
      return fail({ kind: 'unreachable' });
    }
  },
});
