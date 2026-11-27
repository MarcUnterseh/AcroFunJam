import { describe, expect, it } from 'vitest';
import {
  canAddVideo,
  checkVideoCaption,
  checkVideoCredit,
  checkVideoDescription,
  checkVideoInput,
  isBeingPrepared,
  maxVideoBytes,
  planVideoUpload,
  recognizeVideoFormat,
  sameVideoStates,
  shouldPollVideos,
  videoPollingLimitMs,
  videoRemovalConsequence,
  type TransitionVideo,
  type VideoFacts,
} from './transition-videos';

const bytes = (...parts: Array<string | number[]>) =>
  new Uint8Array(
    parts.flatMap((part) => (typeof part === 'string' ? [...part].map((c) => c.charCodeAt(0)) : part)),
  );

const ftyp = (brand: string) => bytes([0, 0, 0, 0x18], 'ftyp', brand, [0, 0, 0, 0], brand, 'isom');

/** An EBML header whose DocType is the given one. */
const ebml = (docType: string) =>
  bytes(
    [0x1a, 0x45, 0xdf, 0xa3, 0x9f, 0x42, 0x86, 0x81, 0x01, 0x42, 0x82, 0x80 | docType.length],
    docType,
    [0, 0, 0, 0],
  );

describe('recognizeVideoFormat', () => {
  it.each([
    ['isom', 'mp4'],
    ['mp42', 'mp4'],
    ['avc1', 'mp4'],
    ['qt  ', 'mov'],
  ] as const)('should recognise the brand %s as %s', (brand, format) => {
    expect(recognizeVideoFormat(ftyp(brand))).toBe(format);
  });

  it('should recognise a WebM from its EBML header', () => {
    expect(recognizeVideoFormat(ebml('webm'))).toBe('webm');
  });

  it.each([
    ['a Matroska file', ebml('matroska')],
    ['a HEIC photo', ftyp('heic')],
    ['a JPEG photo', bytes([0xff, 0xd8, 0xff, 0xe0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])],
    ['a PDF document', bytes('%PDF-1.7\n', [0, 0, 0, 0, 0, 0, 0])],
    ['a file too short', bytes([0, 0, 0])],
  ])('should not recognise %s as a video', (_case, content) => {
    expect(recognizeVideoFormat(content)).toBeNull();
  });
});

const facts = (overrides: Partial<VideoFacts> = {}): VideoFacts => ({
  format: 'mp4',
  size: 20 * 1024 * 1024,
  durationMs: 12_000,
  dimensions: { width: 1920, height: 1080 },
  ...overrides,
});

describe('planVideoUpload', () => {
  it('should send a video MP4 of 12 s, 20 MiB, 1920 × 1080', () => {
    expect(planVideoUpload(facts())).toEqual({ kind: 'send' });
  });

  it('should refuse a file that is not a video MP4, MOV or WebM', () => {
    expect(planVideoUpload(facts({ format: null }))).toEqual({ kind: 'refuse', reason: 'format' });
  });

  it('should refuse a video heavier than 100 MiB, and send one of 100 MiB', () => {
    expect(planVideoUpload(facts({ size: maxVideoBytes + 1 }))).toEqual({
      kind: 'refuse',
      reason: 'too-large',
    });
    expect(planVideoUpload(facts({ size: maxVideoBytes }))).toEqual({ kind: 'send' });
  });

  it.each([2_000, 30_000, 30_900, 30_999])('should send a video of %i ms', (durationMs) => {
    expect(planVideoUpload(facts({ durationMs }))).toEqual({ kind: 'send' });
  });

  it.each([
    [31_000, 31],
    [31_700, 31],
    [45_200, 45],
  ])('should refuse a video of %i ms, said to last %i seconds (truncated)', (durationMs, seconds) => {
    expect(planVideoUpload(facts({ durationMs }))).toEqual({ kind: 'refuse', reason: 'too-long', seconds });
  });

  it('should refuse a video shorter than 2 seconds', () => {
    expect(planVideoUpload(facts({ durationMs: 1_999 }))).toEqual({ kind: 'refuse', reason: 'too-short' });
  });

  it.each([
    [{ width: 640, height: 360 }, 'refuse'],
    [{ width: 854, height: 480 }, 'send'],
    [{ width: 480, height: 854 }, 'send'],
  ] as const)('should check the shorter side of %o', (dimensions, kind) => {
    expect(planVideoUpload(facts({ dimensions })).kind).toBe(kind);
  });

  it('should send a video whose duration and dimensions are unknown: the API checks them', () => {
    expect(planVideoUpload(facts({ durationMs: null, dimensions: null }))).toEqual({ kind: 'send' });
  });
});

describe('texts of a video', () => {
  it('should require a caption, without the superfluous spaces, of 100 characters at most', () => {
    expect(checkVideoCaption('   ')).toBe('required');
    expect(checkVideoCaption('a'.repeat(100))).toBeNull();
    expect(checkVideoCaption(`  ${'a'.repeat(100)}  `)).toBeNull();
    expect(checkVideoCaption('a'.repeat(101))).toBe('too-long');
  });

  it('should require a credit of 100 characters at most', () => {
    expect(checkVideoCredit('')).toBe('required');
    expect(checkVideoCredit('Léa   Martin')).toBeNull();
    expect(checkVideoCredit('a'.repeat(101))).toBe('too-long');
  });

  it('should accept no description, and a description of 300 characters at most', () => {
    expect(checkVideoDescription('')).toBeNull();
    expect(checkVideoDescription('a'.repeat(300))).toBeNull();
    expect(checkVideoDescription('a'.repeat(301))).toBe('too-long');
  });

  it('should give every error of the form at once', () => {
    expect(
      checkVideoInput({
        hasFile: false,
        caption: '',
        credit: ' ',
        description: 'a'.repeat(301),
        rightsConfirmed: false,
      }),
    ).toEqual({
      file: 'required',
      caption: 'required',
      credit: 'required',
      description: 'too-long',
      rights: 'required',
    });
    expect(
      checkVideoInput({
        hasFile: true,
        caption: 'Vue de face',
        credit: 'Léa Martin',
        description: '',
        rightsConfirmed: true,
      }),
    ).toEqual({});
  });
});

const aVideo = (overrides: Partial<TransitionVideo> = {}): TransitionVideo => ({
  id: 'video-1',
  caption: 'Pop to Bird, vue de côté',
  credit: 'Léa Martin',
  description: null,
  width: 720,
  height: 1280,
  durationMs: 12_000,
  preparation: 'ready',
  sources: { video: '/catalog/videos/video-1/video', poster: '/catalog/videos/video-1/poster' },
  ...overrides,
});

describe('the videos of a transition', () => {
  it('should allow another video while the transition has fewer than 3, in preparation included', () => {
    expect(canAddVideo(2)).toBe(true);
    expect(canAddVideo(3)).toBe(false);
  });

  it('should say that removing the only video leaves the transition without video', () => {
    expect(videoRemovalConsequence([aVideo()])).toBe('last');
    expect(videoRemovalConsequence([aVideo(), aVideo({ id: 'video-2' })])).toBe('other');
  });

  it('should tell whether a video is being prepared', () => {
    expect(isBeingPrepared([aVideo(), aVideo({ preparation: 'failed' })])).toBe(false);
    expect(isBeingPrepared([aVideo(), aVideo({ preparation: 'in-preparation', sources: null })])).toBe(true);
  });

  it('should poll the videos while one is being prepared, for 15 minutes at most (ADR 0041)', () => {
    const preparing = [aVideo({ preparation: 'in-preparation', sources: null })];
    expect(shouldPollVideos(preparing, 0)).toBe(true);
    expect(shouldPollVideos(preparing, videoPollingLimitMs - 1)).toBe(true);
    expect(shouldPollVideos(preparing, videoPollingLimitMs)).toBe(false);
    expect(shouldPollVideos([aVideo()], 0)).toBe(false);
  });

  it('should compare the videos on their preparation, not on their texts', () => {
    const preparing = aVideo({ preparation: 'in-preparation', sources: null });
    expect(sameVideoStates([preparing], [{ ...preparing, caption: 'Autre' }])).toBe(true);
    expect(sameVideoStates([preparing], [aVideo()])).toBe(false);
    expect(sameVideoStates([preparing], [])).toBe(false);
  });
});
