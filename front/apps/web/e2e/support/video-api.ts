import { readFileSync } from 'node:fs';
import type { BrowserContext, Route } from '@playwright/test';
import type { components } from '@acrofunjam/api-client/schema';
import type { CatalogApi } from './catalog-api';
import type { IdentityApi } from './identity-api';
import { partsOf } from './photo-api';

type VideoResponse = components['schemas']['VideoResponse'];
type VideoListResponse = components['schemas']['VideoListResponse'];
type ProblemDetails = components['schemas']['ProblemDetails'];

export type Preparation = 'ready' | 'in-preparation' | 'failed';

/** A video as the simulated catalog keeps it: its texts, its presented dimensions, its duration, its preparation. */
export type StoredVideo = {
  id: string;
  transitionId: string;
  caption: string;
  credit: string;
  description: string | null;
  width: number;
  height: number;
  durationMs: number;
  preparation: Preparation;
};

const maxVideosPerTransition = 3;
const maxVideoBytes = 100 * 1024 * 1024;

/**
 * The small video served for every prepared video, and its poster (ADR 0041: generated once by ffmpeg, versioned in the
 * fixtures of the site: Playwright must read a real video).
 */
const media = {
  video: { body: readFileSync(new URL('./media/transition.mp4', import.meta.url)), contentType: 'video/mp4' },
  poster: {
    body: readFileSync(new URL('./media/transition-poster.webp', import.meta.url)),
    contentType: 'image/webp',
  },
} as const;

/** Without the superfluous spaces, as the API keeps a text (ADR 0017). */
const normalized = (text: string) => text.split(/\s+/u).filter(Boolean).join(' ');

/** « une vidéo MP4 de 12 s », « … de 30,9 s … », « … de 20 s filmée par un iPhone »: the duration it states. */
export const durationNamed = (description: string): number => {
  const match = /de ([\d,]+) s\b/.exec(description);
  if (!match) throw new Error(`Durée inconnue : ${description}`);
  return Math.round(Number(match[1]!.replace(',', '.')) * 1000);
};

/**
 * The dimensions AcroFunJam presents a video in (720 pixels at most on the shorter side, never enlarged): « une vidéo MP4
 * de 12 s » is a 1920×1080 video, a video filmed by an iPhone is in portrait.
 */
export const presentedDimensionsNamed = (description: string): { width: number; height: number } => {
  const stated = /(\d+)×(\d+)/.exec(description);
  const [width, height] = stated
    ? [Number(stated[1]), Number(stated[2])]
    : /iPhone/.test(description)
      ? [1080, 1920]
      : [1920, 1080];
  const ratio = Math.min(1, 720 / Math.min(width, height));
  return { width: Math.round(width * ratio), height: Math.round(height * ratio) };
};

/** The duration (mvhd) and the dimensions (tkhd of the first track) of an ISO file, as the API measures them. */
const measured = (file: Buffer): { durationMs: number; width: number; height: number } => {
  const mvhd = file.indexOf('mvhd', 0, 'latin1');
  const tkhd = file.indexOf('tkhd', 0, 'latin1');
  if (mvhd < 0 || tkhd < 0) return { durationMs: 12_000, width: 1280, height: 720 };
  const timescale = file.readUInt32BE(mvhd + 16);
  const duration = file.readUInt32BE(mvhd + 20);
  const width = file.readUInt32BE(tkhd + 80) >>> 16;
  const height = file.readUInt32BE(tkhd + 84) >>> 16;
  const ratio = Math.min(1, 720 / Math.min(width, height));
  return {
    durationMs: Math.round((duration / timescale) * 1000),
    width: Math.round(width * ratio),
    height: Math.round(height * ratio),
  };
};

/** MP4, MOV or WebM, recognised from the first bytes (Q292). */
const isVideo = (file: Buffer) =>
  file.toString('latin1', 4, 8) === 'ftyp' ||
  file.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));

/**
 * Simulated videos of the transitions (story 12, ADR 0041): the steps put videos here, the simulated catalog presents them
 * in the page of a pose (a visitor: the ready ones only), and POST /catalog/transitions/{id}/videos (multipart, 202),
 * GET (manager), PUT and DELETE …/videos/{videoId}, GET /catalog/videos/{videoId}/video|poster (with Range) are answered
 * by Playwright. Same statuses and codes as the API: 401, 403 without « gérer les vidéos », 404, 409
 * catalog.video-limit-reached, 413 video.too-large, 400 video.*.
 */
export class VideoApi {
  private readonly videos: StoredVideo[] = [];
  private readonly removed = new Set<string>();
  /** The files of the videos the browser downloaded, in order: « poster » or « video ». */
  readonly served: Array<{ id: string; file: string }> = [];
  /** The requests of the list of the videos of a transition (polling of the page of a pose). */
  readonly listed: string[] = [];
  private held: Promise<void> | null = null;
  private release: () => void = () => {};

  constructor(
    private readonly context: BrowserContext,
    private readonly identityApi: IdentityApi,
    private readonly catalogApi: CatalogApi,
  ) {
    catalogApi.videosOf = (transitionId, route) => {
      const all = this.videos.filter((video) => video.transitionId === transitionId);
      const shown = this.managesVideos(route) ? all : all.filter((video) => video.preparation === 'ready');
      return shown.map((video) => this.response(video));
    };
  }

  /** The transition of this name (or « de Bird vers Star » without a name) in the simulated catalog. */
  transitionNamed(name: string, from?: string, to?: string): string {
    const transition = this.catalogApi.transitions.find(
      (published) =>
        (published.name ?? '') === name &&
        (from === undefined || published.fromPoseId === this.catalogApi.poseNamed(from).id) &&
        (to === undefined || published.toPoseId === this.catalogApi.poseNamed(to).id),
    );
    if (!transition) throw new Error(`Aucune transition publiée ${name}`);
    return transition.id;
  }

  /** A video added to the transition (by a validator, before the step), ready unless said otherwise. */
  add(transitionId: string, video: Omit<StoredVideo, 'id' | 'transitionId'>): StoredVideo {
    const stored = { id: crypto.randomUUID(), transitionId, ...video };
    this.videos.push(stored);
    return stored;
  }

  of(transitionId: string): readonly StoredVideo[] {
    return this.videos.filter((video) => video.transitionId === transitionId);
  }

  named(caption: string): StoredVideo {
    const video = this.videos.find((stored) => stored.caption === caption);
    if (!video) throw new Error(`Aucune vidéo « ${caption} »`);
    return video;
  }

  /** AcroFunJam prepared it (ready), or could not (failed). */
  prepare(caption: string, preparation: Preparation): void {
    this.named(caption).preparation = preparation;
  }

  /** The answer to the next additions waits until the returned function is called. */
  holdAdditions(): void {
    this.held = new Promise((resolve) => {
      this.release = () => {
        this.held = null;
        resolve();
      };
    });
  }

  /** The additions held answer. */
  releaseAdditions(): void {
    this.release();
  }

  private managesVideos(route: Route): boolean {
    const account = this.identityApi.accountOf(route);
    return account !== undefined && account.role !== 'user';
  }

  private response(video: StoredVideo): VideoResponse {
    const { id, caption, credit, description, width, height, durationMs, preparation } = video;
    const base = `/catalog/videos/${id}`;
    return {
      id,
      caption,
      credit,
      description,
      width,
      height,
      durationMs,
      preparation,
      sources: preparation === 'ready' ? { video: `${base}/video`, poster: `${base}/poster` } : null,
    };
  }

  async start(): Promise<void> {
    // A request answered by Playwright never reports the progress of its sending: the browser keeps the sendings of the
    // videos, and the simulated API tells them the whole file is sent (sentVideos) before answering, as the network
    // would, so that the site shows the checks of the sending (UX-59) whatever the time the answer takes.
    await this.context.addInitScript(() => {
      const open = XMLHttpRequest.prototype.open;
      const send = XMLHttpRequest.prototype.send;
      const urls = new WeakMap<XMLHttpRequest, string>();
      const sendings = new Set<XMLHttpRequest>();
      XMLHttpRequest.prototype.open = function (this: XMLHttpRequest, ...args: Parameters<typeof open>) {
        urls.set(this, String(args[1]));
        return open.apply(this, args);
      } as typeof open;
      XMLHttpRequest.prototype.send = function (
        this: XMLHttpRequest,
        body?: Document | XMLHttpRequestBodyInit | null,
      ) {
        if (/\/catalog\/transitions\/[^/]+\/videos$/.test(urls.get(this) ?? '')) sendings.add(this);
        return send.call(this, body);
      };
      (window as unknown as { sentVideos: () => void }).sentVideos = () => {
        for (const xhr of sendings) {
          xhr.upload.dispatchEvent(
            new ProgressEvent('progress', { lengthComputable: true, loaded: 1, total: 1 }),
          );
          xhr.upload.dispatchEvent(new ProgressEvent('load'));
        }
        sendings.clear();
      };
    });
    await this.context.route('**/catalog/transitions/*/videos', (route) =>
      this.manage(route, () =>
        route.request().method() === 'GET' ? this.list(route) : this.addFromRequest(route),
      ),
    );
    await this.context.route('**/catalog/transitions/*/videos/*', (route) =>
      this.manage(route, () =>
        route.request().method() === 'DELETE' ? this.remove(route) : this.correct(route),
      ),
    );
    await this.context.route('**/catalog/videos/*/*', (route) => this.serve(route));
  }

  /** Tells the page that sent the video that its whole file is sent (see start). */
  private async reportSent(route: Route): Promise<void> {
    const frame = route.request().frame();
    await frame.evaluate(() => (window as unknown as { sentVideos?: () => void }).sentVideos?.());
  }

  /** The segment of the path from its end (0: the last). */
  private segment(route: Route, fromEnd: number): string {
    const segments = new URL(route.request().url()).pathname.split('/');
    return segments[segments.length - 1 - fromEnd] ?? '';
  }

  /** AcroFunJam reachable, then the session (401), then the capability (403), as the API policies do. */
  private manage(route: Route, answer: () => Promise<void>) {
    if (this.catalogApi.isUnreachable) return route.abort('connectionrefused');
    const account = this.identityApi.accountOf(route);
    if (!account) return this.problem(route, 401, 'Unauthorized');
    if (account.role === 'user') return this.problem(route, 403, 'identity.capability-required');
    return answer();
  }

  /** The id of a published transition of the path, or undefined. */
  private transitionOf(route: Route, fromEnd: number): string | undefined {
    const id = this.segment(route, fromEnd);
    return this.catalogApi.transitions.some((transition) => transition.id === id) ? id : undefined;
  }

  private async list(route: Route) {
    const transitionId = this.transitionOf(route, 1);
    if (!transitionId) return this.problem(route, 404, 'catalog.transition-not-found');
    this.listed.push(transitionId);
    const body: VideoListResponse = { videos: this.of(transitionId).map((video) => this.response(video)) };
    return route.fulfill({ json: body });
  }

  private async addFromRequest(route: Route) {
    const transitionId = this.transitionOf(route, 1);
    if (!transitionId) return this.problem(route, 404, 'catalog.transition-not-found');
    const request = route.request();
    const parts = partsOf(
      request.postDataBuffer() ?? Buffer.alloc(0),
      request.headers()['content-type'] ?? '',
    );
    const field = (name: string) =>
      parts.find((part) => part.name === name && part.filename === null)?.content.toString('utf8');
    const file = parts.find((part) => part.name === 'file' && part.filename !== null)?.content;
    const caption = normalized(field('caption') ?? '');
    const credit = normalized(field('credit') ?? '');
    const description = normalized(field('description') ?? '') || null;
    if (!file || file.length === 0) return this.problem(route, 400, 'video.file-required');
    if (file.length > maxVideoBytes) return this.problem(route, 413, 'video.too-large');
    if (!isVideo(file)) return this.problem(route, 400, 'video.format-not-accepted');
    if (caption === '') return this.problem(route, 400, 'video.caption-required');
    if ([...caption].length > 100) return this.problem(route, 400, 'video.caption-too-long');
    if (credit === '') return this.problem(route, 400, 'video.credit-required');
    if ([...credit].length > 100) return this.problem(route, 400, 'video.credit-too-long');
    if (description !== null && [...description].length > 300)
      return this.problem(route, 400, 'video.description-too-long');
    if (field('rightsConfirmed') !== 'true')
      return this.problem(route, 400, 'video.rights-confirmation-required');
    if (this.of(transitionId).length >= maxVideosPerTransition)
      return this.problem(route, 409, 'catalog.video-limit-reached');
    // The whole file is received: the browser is told so before any answer, then the checks of the sending take a while
    // (« Vérification de la vidéo… »).
    await this.reportSent(route);
    if (this.held) await this.held;
    const video = this.add(transitionId, {
      caption,
      credit,
      description,
      ...measured(file),
      preparation: 'in-preparation',
    });
    return route.fulfill({ status: 202, json: this.response(video) });
  }

  private videoOfRoute(route: Route): StoredVideo | undefined {
    const transitionId = this.transitionOf(route, 2);
    const id = this.segment(route, 0);
    return this.videos.find((video) => video.transitionId === transitionId && video.id === id);
  }

  private async correct(route: Route) {
    const video = this.videoOfRoute(route);
    if (!video) return this.problem(route, 404, 'catalog.video-not-found');
    const body = route.request().postDataJSON() as {
      caption: string | null;
      credit: string | null;
      description: string | null;
    };
    const caption = normalized(body.caption ?? '');
    const credit = normalized(body.credit ?? '');
    const description = normalized(body.description ?? '') || null;
    if (caption === '') return this.problem(route, 400, 'video.caption-required');
    if (credit === '') return this.problem(route, 400, 'video.credit-required');
    Object.assign(video, { caption, credit, description });
    return route.fulfill({ json: this.response(video) });
  }

  private async remove(route: Route) {
    const video = this.videoOfRoute(route);
    if (!video) return this.problem(route, 404, 'catalog.video-not-found');
    this.removed.add(video.id);
    this.videos.splice(this.videos.indexOf(video), 1);
    return route.fulfill({ status: 204 });
  }

  /** The prepared video or its poster, with the partial requests of a player (a single range, ADR 0041). */
  private async serve(route: Route) {
    if (this.catalogApi.isUnreachable) return route.abort('connectionrefused');
    const id = this.segment(route, 1);
    const file = this.segment(route, 0);
    const video = this.videos.find((stored) => stored.id === id);
    if (!video || video.preparation !== 'ready' || (file !== 'video' && file !== 'poster'))
      return this.problem(route, 404, 'catalog.video-not-found');
    this.served.push({ id, file });
    const { body, contentType } = media[file];
    const range = /^bytes=(\d*)-(\d*)$/.exec(route.request().headers()['range'] ?? '');
    if (!range)
      return route.fulfill({ status: 200, contentType, body, headers: { 'Accept-Ranges': 'bytes' } });
    const start = range[1] ? Number(range[1]) : body.length - Number(range[2]);
    const end = range[1] && range[2] ? Math.min(Number(range[2]), body.length - 1) : body.length - 1;
    return route.fulfill({
      status: 206,
      contentType,
      body: body.subarray(start, end + 1),
      headers: { 'Accept-Ranges': 'bytes', 'Content-Range': `bytes ${start}-${end}/${body.length}` },
    });
  }

  private problem(route: Route, status: number, title: string) {
    const body: ProblemDetails = { title, status };
    return route.fulfill({ status, contentType: 'application/problem+json', body: JSON.stringify(body) });
  }
}
