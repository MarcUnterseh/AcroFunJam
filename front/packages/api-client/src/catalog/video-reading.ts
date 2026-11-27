import type { TransitionVideo, VideoPreparation } from '@acrofunjam/core';

// Story 12 « Vidéos des transitions » (ADR 0041): a video as the API presents it, read into the client domain.

const isString = (value: unknown): value is string => typeof value === 'string';
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;
const isNumber = (value: unknown): value is number => typeof value === 'number';

const preparations: readonly string[] = ['ready', 'in-preparation', 'failed'] satisfies VideoPreparation[];

/** A video of a transition, or null when it cannot be read (the server may evolve before the client). */
export const toTransitionVideo = (value: unknown): TransitionVideo | null => {
  if (!isRecord(value)) return null;
  const { id, caption, credit, description, width, height, durationMs, preparation, sources } = value;
  if (
    !isString(id) ||
    !isString(caption) ||
    !isString(credit) ||
    !(description === null || description === undefined || isString(description)) ||
    !isNumber(width) ||
    !isNumber(height) ||
    !isNumber(durationMs) ||
    !isString(preparation) ||
    !preparations.includes(preparation)
  )
    return null;
  const readSources =
    isRecord(sources) && isString(sources['video']) && isString(sources['poster'])
      ? { video: sources['video'], poster: sources['poster'] }
      : null;
  // A ready video is presented with its files.
  if (preparation === 'ready' && !readSources) return null;
  return {
    id,
    caption,
    credit,
    description: description ?? null,
    width,
    height,
    durationMs,
    preparation: preparation as VideoPreparation,
    sources: readSources,
  };
};

/** A video in a preparation the client does not know yet is left out (ADR 0041: « tolérer un état inconnu »). */
const isUnknownPreparation = (value: unknown) =>
  isRecord(value) && isString(value['preparation']) && !preparations.includes(value['preparation']);

/** The videos of a transition, in the order received, or null when one of them cannot be read. */
export const toTransitionVideos = (value: unknown): TransitionVideo[] | null => {
  if (!Array.isArray(value)) return null;
  const videos = value.filter((video) => !isUnknownPreparation(video)).map(toTransitionVideo);
  return videos.every((video) => video !== null) ? videos : null;
};
