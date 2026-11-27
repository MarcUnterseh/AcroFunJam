import { recognizeVideoFormat, type VideoInspector } from '@acrofunjam/core';
import { readMp4Header } from './mp4-header';

// Story 12 (ADR 0041, UX-55): the adapter of the browser that examines a chosen video. The name of a file is never
// trusted; an MP4 or a MOV is measured from its header, even when the browser cannot play it (HEVC outside Safari).

/** A WebM is measured by the browser, when it can read it (not in jsdom); unknown otherwise: the API checks it. */
const measuredByTheBrowser = (file: Blob) =>
  new Promise<{ durationMs: number; dimensions: { width: number; height: number } } | null>((resolve) => {
    if (typeof URL.createObjectURL !== 'function' || typeof document === 'undefined') return resolve(null);
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    const done = (value: Parameters<typeof resolve>[0]) => {
      URL.revokeObjectURL(url);
      resolve(value);
    };
    video.preload = 'metadata';
    video.onloadedmetadata = () =>
      done(
        Number.isFinite(video.duration) && video.videoWidth > 0
          ? {
              durationMs: Math.round(video.duration * 1000),
              dimensions: { width: video.videoWidth, height: video.videoHeight },
            }
          : null,
      );
    video.onerror = () => done(null);
    setTimeout(() => done(null), 5_000);
    video.src = url;
  });

export const browserVideoInspector: VideoInspector<File> = {
  async inspect(file) {
    const head = new Uint8Array(await file.slice(0, 64).arrayBuffer());
    const format = recognizeVideoFormat(head);
    const measured =
      format === 'mp4' || format === 'mov'
        ? await readMp4Header({
            size: file.size,
            read: async (start, end) => new Uint8Array(await file.slice(start, end).arrayBuffer()),
          })
        : format === 'webm'
          ? await measuredByTheBrowser(file)
          : null;
    return {
      format,
      size: file.size,
      durationMs: measured?.durationMs ?? null,
      dimensions: measured?.dimensions ?? null,
    };
  },
};
