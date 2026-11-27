import {
  fail,
  ok,
  type AddPhotoInput,
  type PosePhoto,
  type PosePhotosFailure,
  type PosePhotosGateway,
  type Result,
} from '@acrofunjam/core';
import type { ApiClient } from '../client';
import { toPosePhoto } from './pose-page-gateway';

// Story 10 « Photos des poses » (ADR 0039). The addition goes through an upload transport, XMLHttpRequest in the
// browser, because fetch does not give the progress of a sending; the other calls go through openapi-fetch.

/** A sending in multipart, with its progress (0 to 1) and its cancellation. */
export type UploadRequest = {
  readonly url: string;
  readonly body: FormData;
  readonly onProgress?: (sent: number) => void;
  readonly signal?: AbortSignal;
};

/** Sends a form and gives the status and the JSON body of the answer; rejects with an AbortError when cancelled. */
export type UploadTransport = (
  request: UploadRequest,
) => Promise<{ readonly status: number; readonly body: unknown }>;

/** The transport of the browser: XMLHttpRequest, with the session cookie (same origin, ADR 0011). */
export const xhrUploadTransport: UploadTransport = (request) =>
  new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', request.url);
    xhr.withCredentials = true;
    xhr.responseType = 'json';
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) request.onProgress?.(event.loaded / event.total);
    };
    // The whole file is sent: the server checks it before answering (« Vérification de la vidéo… », ADR 0041).
    xhr.upload.onload = () => request.onProgress?.(1);
    const abort = () => xhr.abort();
    const settled = () => request.signal?.removeEventListener('abort', abort);
    xhr.onload = () => {
      settled();
      resolve({ status: xhr.status, body: xhr.response as unknown });
    };
    xhr.onerror = () => {
      settled();
      reject(new TypeError('Failed to send'));
    };
    xhr.onabort = () => reject(new DOMException('Aborted', 'AbortError'));
    request.signal?.addEventListener('abort', abort, { once: true });
    if (request.signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }
    xhr.send(request.body);
  });

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

/** The business code of a ProblemDetails is its title (ADR 0007). */
const codeOf = (problem: unknown): string =>
  isRecord(problem) && typeof problem['title'] === 'string' ? problem['title'] : '';

const failureOf = (status: number, problem: unknown): PosePhotosFailure => {
  const code = codeOf(problem);
  if (status === 401) return { kind: 'unauthenticated' };
  if (status === 403) return { kind: 'forbidden' };
  if (status === 413) return { kind: 'too-large' };
  if (code === 'catalog.pose-not-found') return { kind: 'not-found' };
  if (code === 'catalog.photo-not-found') return { kind: 'photo-not-found' };
  if (code === 'catalog.photo-limit-reached') return { kind: 'limit-reached' };
  if (status === 400 && code.startsWith('photo.')) return { kind: 'invalid', code };
  if (status >= 500) return { kind: 'unreachable' };
  // A refusal the site does not know: the API is newer than the site, which must be reloaded.
  return { kind: 'outdated' };
};

const isAbort = (error: unknown) => error instanceof DOMException && error.name === 'AbortError';

/** HTTP adapter of the PosePhotosGateway port of @acrofunjam/core, for a file of the browser (a Blob). */
export const createPosePhotosGateway = (
  client: ApiClient,
  baseUrl: string,
  upload: UploadTransport = xhrUploadTransport,
): PosePhotosGateway<Blob> => ({
  async addPhoto(poseId, input: AddPhotoInput<Blob>, options): Promise<Result<PosePhoto, PosePhotosFailure>> {
    const body = new FormData();
    body.append('file', input.file, input.file instanceof File ? input.file.name : 'photo.jpg');
    body.append('altText', input.altText);
    body.append('credit', input.credit);
    body.append('rightsConfirmed', String(input.rightsConfirmed));
    try {
      const answer = await upload({
        url: `${baseUrl}/catalog/poses/${encodeURIComponent(poseId)}/photos`,
        body,
        ...(options.onProgress ? { onProgress: options.onProgress } : {}),
        ...(options.signal ? { signal: options.signal } : {}),
      });
      if (answer.status !== 201) return fail(failureOf(answer.status, answer.body));
      const photo = toPosePhoto(answer.body);
      return photo ? ok(photo) : fail({ kind: 'outdated' });
    } catch (error) {
      return fail(isAbort(error) ? { kind: 'cancelled' } : { kind: 'unreachable' });
    }
  },

  async removePhoto(poseId, photoId) {
    try {
      const { error, response } = await client.DELETE('/catalog/poses/{id}/photos/{photoId}', {
        params: { path: { id: poseId, photoId } },
      });
      return response.ok ? ok(undefined) : fail(failureOf(response.status, error));
    } catch {
      return fail({ kind: 'unreachable' });
    }
  },

  async chooseMainPhoto(poseId, photoId) {
    try {
      const { error, response } = await client.PUT('/catalog/poses/{id}/photos/main', {
        params: { path: { id: poseId } },
        body: { photoId },
      });
      return response.ok ? ok(undefined) : fail(failureOf(response.status, error));
    } catch {
      return fail({ kind: 'unreachable' });
    }
  },

  async correctPhoto(poseId, photoId, texts) {
    try {
      const { data, error, response } = await client.PUT('/catalog/poses/{id}/photos/{photoId}', {
        params: { path: { id: poseId, photoId } },
        body: texts,
      });
      if (!response.ok) return fail(failureOf(response.status, error));
      const photo = toPosePhoto(data);
      return photo ? ok(photo) : fail({ kind: 'outdated' });
    } catch {
      return fail({ kind: 'unreachable' });
    }
  },
});
