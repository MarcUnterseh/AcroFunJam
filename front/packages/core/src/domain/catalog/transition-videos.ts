// Story 12 « Vidéos des transitions » (ADR 0041): the videos of a published transition as the site presents them, and
// what the site checks before sending one. The API decides in the end (format, weight, duration, dimensions, credit
// that names nobody).

/** The preparation of a video (glossary « Préparation (d'une vidéo) »): only a ready video is shown to a visitor. */
export type VideoPreparation = 'ready' | 'in-preparation' | 'failed';

/** The addresses of the prepared video and of its poster (its first image); null while it is not ready. */
export type VideoSources = { readonly video: string; readonly poster: string };

/**
 * A video of a transition (glossary « Vidéo »): its caption, its credit, its optional description (V23), its presented
 * dimensions (planned while in preparation), its duration, its preparation.
 */
export type TransitionVideo = {
  readonly id: string;
  readonly caption: string;
  readonly credit: string;
  readonly description: string | null;
  readonly width: number;
  readonly height: number;
  readonly durationMs: number;
  readonly preparation: VideoPreparation;
  readonly sources: VideoSources | null;
};

/** The formats a video is accepted in, recognised from its content (V4, Q292). */
export type VideoFormat = 'mp4' | 'mov' | 'webm';

export type VideoDimensions = { readonly width: number; readonly height: number };

/** What the platform finds in a chosen file. */
export type VideoFacts = {
  readonly format: VideoFormat | null;
  readonly size: number;
  /** null: unknown (a WebM the browser cannot read, a fragmented MP4): the API checks it. */
  readonly durationMs: number | null;
  /** Upright dimensions; null when unknown. */
  readonly dimensions: VideoDimensions | null;
};

/** At most 3 videos per transition, in preparation included (V15). */
export const maxVideosPerTransition = 3;

/** 100 MiB, as the API (V5, Q293). */
export const maxVideoBytes = 100 * 1024 * 1024;

/** At least 2 seconds, less than 31 seconds (V6, decision 7). */
export const minVideoMs = 2_000;
export const maxVideoMsExcluded = 31_000;
/** The maximum said in the messages: « 30 secondes au plus ». */
export const maxVideoSeconds = 30;

/** At least 480 pixels on the shorter side (V7, Q295). */
export const minVideoShortSide = 480;

export const videoCaptionMaxLength = 100;
export const videoCreditMaxLength = 100;
export const videoDescriptionMaxLength = 300;

const startsWith = (content: Uint8Array, offset: number, expected: readonly number[]) =>
  expected.every((value, i) => content[offset + i] === value);

const ascii = (text: string) => [...text].map((c) => c.charCodeAt(0));

/** The brands of an ISO box that announce a HEIC or HEIF photo, not a video. */
const photoBrands = ['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'mif1', 'msf1', 'avif', 'avis'];

/** The DocType of an EBML header (WebM or Matroska), read in its first bytes; null when not found. */
const docTypeOf = (content: Uint8Array): string | null => {
  for (let i = 4; i + 3 < content.length; i++)
    if (content[i] === 0x42 && content[i + 1] === 0x82) {
      const size = content[i + 2]! & 0x7f;
      return String.fromCharCode(...content.subarray(i + 3, i + 3 + size));
    }
  return null;
};

/** The format of a video from its first bytes (the name of the file is never trusted); null when not accepted. */
export const recognizeVideoFormat = (content: Uint8Array): VideoFormat | null => {
  if (content.length < 12) return null;
  if (startsWith(content, 4, ascii('ftyp'))) {
    if (startsWith(content, 8, ascii('qt  '))) return 'mov';
    return photoBrands.some((brand) => startsWith(content, 8, ascii(brand))) ? null : 'mp4';
  }
  if (startsWith(content, 0, [0x1a, 0x45, 0xdf, 0xa3])) return docTypeOf(content) === 'webm' ? 'webm' : null;
  return null;
};

/** What the site does with the chosen file, before sending it (V4 to V7); the duration said truncated (UX-48). */
export type VideoUploadPlan =
  | { readonly kind: 'send' }
  | { readonly kind: 'refuse'; readonly reason: 'format' | 'too-large' | 'too-short' | 'too-small' }
  | { readonly kind: 'refuse'; readonly reason: 'too-long'; readonly seconds: number };

export const planVideoUpload = (facts: VideoFacts): VideoUploadPlan => {
  if (facts.format === null) return { kind: 'refuse', reason: 'format' };
  if (facts.size > maxVideoBytes) return { kind: 'refuse', reason: 'too-large' };
  const { durationMs, dimensions } = facts;
  if (durationMs !== null && durationMs >= maxVideoMsExcluded)
    return { kind: 'refuse', reason: 'too-long', seconds: Math.floor(durationMs / 1000) };
  if (durationMs !== null && durationMs < minVideoMs) return { kind: 'refuse', reason: 'too-short' };
  if (dimensions && Math.min(dimensions.width, dimensions.height) < minVideoShortSide)
    return { kind: 'refuse', reason: 'too-small' };
  return { kind: 'send' };
};

/** Counted in characters (code points) once the superfluous spaces are removed, as the API (ADR 0017). */
const normalized = (text: string) => text.normalize('NFC').split(/\s+/u).filter(Boolean).join(' ');
const length = (text: string) => [...normalized(text)].length;

export type VideoTextError = 'required' | 'too-long';

/** The caption is mandatory and has 100 characters at most (V12). */
export const checkVideoCaption = (caption: string): VideoTextError | null => {
  if (normalized(caption) === '') return 'required';
  return length(caption) > videoCaptionMaxLength ? 'too-long' : null;
};

/** The credit is mandatory and has 100 characters at most (V13); a credit naming nobody is the API's refusal. */
export const checkVideoCredit = (credit: string): VideoTextError | null => {
  if (normalized(credit) === '') return 'required';
  return length(credit) > videoCreditMaxLength ? 'too-long' : null;
};

/** The description is optional and has 300 characters at most (V23). */
export const checkVideoDescription = (description: string): 'too-long' | null =>
  length(description) > videoDescriptionMaxLength ? 'too-long' : null;

export type VideoInput = {
  readonly hasFile: boolean;
  readonly caption: string;
  readonly credit: string;
  readonly description: string;
  readonly rightsConfirmed: boolean;
};

export type VideoInputErrors = {
  readonly file?: 'required';
  readonly caption?: VideoTextError;
  readonly credit?: VideoTextError;
  readonly description?: 'too-long';
  readonly rights?: 'required';
};

/** Every error of the form at once, in its order (video, caption, credit, description, confirmation of the rights). */
export const checkVideoInput = (input: VideoInput): VideoInputErrors => {
  const caption = checkVideoCaption(input.caption);
  const credit = checkVideoCredit(input.credit);
  const description = checkVideoDescription(input.description);
  return {
    ...(input.hasFile ? {} : { file: 'required' as const }),
    ...(caption ? { caption } : {}),
    ...(credit ? { credit } : {}),
    ...(description ? { description } : {}),
    ...(input.rightsConfirmed ? {} : { rights: 'required' as const }),
  };
};

/** Another video can be added while the transition has fewer than 3, in preparation included (V15). */
export const canAddVideo = (count: number): boolean => count < maxVideosPerTransition;

/** What removing a video changes, said in its confirmation: the last one (no video left), or another one. */
export const videoRemovalConsequence = (videos: readonly TransitionVideo[]): 'last' | 'other' =>
  videos.length === 1 ? 'last' : 'other';

export const isBeingPrepared = (videos: readonly TransitionVideo[]): boolean =>
  videos.some((video) => video.preparation === 'in-preparation');

/** The site reads the videos of a transition again every 5 seconds while one is being prepared (ADR 0041, UX-52)… */
export const videoPollingIntervalMs = 5_000;
/** …for 15 minutes at most. */
export const videoPollingLimitMs = 15 * 60_000;

export const shouldPollVideos = (videos: readonly TransitionVideo[], elapsedMs: number): boolean =>
  isBeingPrepared(videos) && elapsedMs < videoPollingLimitMs;

/** The same videos in the same preparation: nothing the page of the pose must read again. */
export const sameVideoStates = (a: readonly TransitionVideo[], b: readonly TransitionVideo[]): boolean =>
  a.length === b.length &&
  a.every((video, i) => video.id === b[i]?.id && video.preparation === b[i]?.preparation);
