import type { BrowserContext, Route } from '@playwright/test';
import type { components } from '@acrofunjam/api-client/schema';
import type { CatalogApi } from './catalog-api';
import type { IdentityApi } from './identity-api';

type PhotoResponse = components['schemas']['PhotoResponse'];
type ProblemDetails = components['schemas']['ProblemDetails'];

/** A photo as the simulated catalog keeps it: its texts and its upright dimensions. */
export type StoredPhoto = { id: string; altText: string; credit: string; width: number; height: number };

const maxPhotosPerPose = 5;
const maxPhotoBytes = 10 * 1024 * 1024;
const minShortSide = 800;

/** Without the superfluous spaces, as the API keeps a text (ADR 0017). */
const normalized = (text: string) => text.split(/\s+/u).filter(Boolean).join(' ');

/** A part of a multipart/form-data body: its name, its file name if any, its content. */
type FormPart = { name: string; filename: string | null; content: Buffer };

const partsOf = (body: Buffer, contentType: string): FormPart[] => {
  const boundary = /boundary=(?:"([^"]+)"|([^;]+))/.exec(contentType);
  if (!boundary) return [];
  const delimiter = Buffer.from(`--${boundary[1] ?? boundary[2]}`);
  const parts: FormPart[] = [];
  let start = body.indexOf(delimiter);
  while (start >= 0) {
    const next = body.indexOf(delimiter, start + delimiter.length);
    if (next < 0) break;
    const part = body.subarray(start + delimiter.length + 2, next - 2);
    const headerEnd = part.indexOf('\r\n\r\n');
    const headers = part.subarray(0, headerEnd).toString('utf8');
    const name = /name="([^"]*)"/.exec(headers)?.[1] ?? '';
    const filename = /filename="([^"]*)"/.exec(headers)?.[1] ?? null;
    parts.push({ name, filename, content: part.subarray(headerEnd + 4) });
    start = next;
  }
  return parts;
};

type Format = 'jpeg' | 'png' | 'webp' | 'heic';

const formatOf = (content: Buffer): Format | null => {
  if (content.length < 12) return null;
  if (content[0] === 0xff && content[1] === 0xd8 && content[2] === 0xff) return 'jpeg';
  if (content.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])))
    return 'png';
  if (content.toString('latin1', 0, 4) === 'RIFF' && content.toString('latin1', 8, 12) === 'WEBP')
    return 'webp';
  if (content.toString('latin1', 4, 8) === 'ftyp') return 'heic';
  return null;
};

/** The dimensions written in a JPEG (its SOF segment) or a PNG (IHDR); a neutral 1600 × 1200 otherwise. */
const dimensionsOf = (content: Buffer, format: Format): { width: number; height: number } => {
  if (format === 'png') return { width: content.readUInt32BE(16), height: content.readUInt32BE(20) };
  if (format === 'jpeg') {
    let offset = 2;
    while (offset + 9 < content.length) {
      if (content[offset] !== 0xff) break;
      const marker = content[offset + 1]!;
      const length = content.readUInt16BE(offset + 2);
      const isFrame = marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker);
      if (isFrame)
        return { height: content.readUInt16BE(offset + 5), width: content.readUInt16BE(offset + 7) };
      offset += 2 + length;
    }
  }
  return { width: 1600, height: 1200 };
};

/**
 * Simulated photos of the poses (story 10, ADR 0039): the steps put photos here (the first is the main photo), the simulated
 * catalog presents them (thumbnail of a card, photos of the page of a pose), and POST /catalog/poses/{id}/photos (multipart),
 * PUT …/photos/main, PUT and DELETE …/photos/{photoId}, GET /catalog/photos/{photoId}/{size} are answered by Playwright.
 * Same statuses and codes as the API: 401 without a session, 403 without « gérer les photos », 404, 409
 * catalog.photo-limit-reached, 400 photo.*; a size is a small SVG with the proportions of the photo.
 */
export class PhotoApi {
  private readonly photos = new Map<string, StoredPhoto[]>();
  private readonly removed = new Set<string>();

  constructor(
    private readonly context: BrowserContext,
    private readonly identityApi: IdentityApi,
    private readonly catalogApi: CatalogApi,
  ) {
    catalogApi.photosOf = (poseId) => (this.photos.get(poseId) ?? []).map((photo) => this.response(photo));
  }

  /** A photo added to the pose (by a validator, before the step): the last one, or the main one when it is the first. */
  add(poseName: string, photo: Omit<StoredPhoto, 'id'>): StoredPhoto {
    const stored = { id: crypto.randomUUID(), ...photo };
    this.photosOfPose(this.catalogApi.poseNamed(poseName).id).push(stored);
    return stored;
  }

  /** Removed from the pose (by a validator, before the step). */
  removeElsewhere(poseName: string, altText: string): void {
    const photos = this.photosOfPose(this.catalogApi.poseNamed(poseName).id);
    const index = photos.findIndex((photo) => photo.altText === altText);
    if (index < 0) throw new Error(`Aucune photo « ${altText} » pour la pose ${poseName}`);
    this.removed.add(photos[index]!.id);
    photos.splice(index, 1);
  }

  /** The photos of the pose, the main one first. */
  of(poseName: string): readonly StoredPhoto[] {
    return this.photosOfPose(this.catalogApi.poseNamed(poseName).id);
  }

  private photosOfPose(poseId: string): StoredPhoto[] {
    let photos = this.photos.get(poseId);
    if (!photos) {
      photos = [];
      this.photos.set(poseId, photos);
    }
    return photos;
  }

  private response({ id, altText, credit, width, height }: StoredPhoto): PhotoResponse {
    const base = `/catalog/photos/${id}`;
    return {
      id,
      altText,
      credit,
      width,
      height,
      sources: { thumbnail: `${base}/thumbnail`, page: `${base}/page`, enlarged: `${base}/enlarged` },
    };
  }

  async start(): Promise<void> {
    await this.context.route('**/catalog/poses/*/photos', (route) =>
      this.manage(route, () => this.addFromRequest(route)),
    );
    await this.context.route('**/catalog/poses/*/photos/*', (route) =>
      this.manage(route, () => {
        const method = route.request().method();
        if (this.segment(route, 0) === 'main') return this.chooseMain(route);
        return method === 'DELETE' ? this.remove(route) : this.correct(route);
      }),
    );
    await this.context.route('**/catalog/photos/*/*', (route) => this.serve(route));
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

  /** The photos of the pose of the path …/poses/{id}/photos[/…], or undefined when the pose is unknown. */
  private photosOfRoute(route: Route, fromEnd: number): StoredPhoto[] | undefined {
    const pose = this.catalogApi.poseWithId(this.segment(route, fromEnd));
    return pose ? this.photosOfPose(pose.id) : undefined;
  }

  private async addFromRequest(route: Route) {
    const photos = this.photosOfRoute(route, 1);
    if (!photos) return this.problem(route, 404, 'catalog.pose-not-found');
    const request = route.request();
    const parts = partsOf(
      request.postDataBuffer() ?? Buffer.alloc(0),
      request.headers()['content-type'] ?? '',
    );
    const field = (name: string) =>
      parts.find((part) => part.name === name && part.filename === null)?.content.toString('utf8');
    const file = parts.find((part) => part.name === 'file' && part.filename !== null)?.content;
    const altText = normalized(field('altText') ?? '');
    const credit = normalized(field('credit') ?? '');
    if (!file || file.length === 0) return this.problem(route, 400, 'photo.file-required');
    if (file.length > maxPhotoBytes) return this.problem(route, 413, 'photo.too-large');
    const format = formatOf(file);
    if (!format) return this.problem(route, 400, 'photo.format-not-accepted');
    const { width, height } = dimensionsOf(file, format);
    if (Math.min(width, height) < minShortSide) return this.problem(route, 400, 'photo.too-small');
    if (altText === '') return this.problem(route, 400, 'photo.alt-text-required');
    if ([...altText].length > 200) return this.problem(route, 400, 'photo.alt-text-too-long');
    if (credit === '') return this.problem(route, 400, 'photo.credit-required');
    if ([...credit].length > 100) return this.problem(route, 400, 'photo.credit-too-long');
    if (field('rightsConfirmed') !== 'true')
      return this.problem(route, 400, 'photo.rights-confirmation-required');
    if (photos.length >= maxPhotosPerPose) return this.problem(route, 409, 'catalog.photo-limit-reached');
    const photo = { id: crypto.randomUUID(), altText, credit, width, height };
    photos.push(photo);
    return route.fulfill({ status: 201, json: this.response(photo) });
  }

  private async chooseMain(route: Route) {
    const photos = this.photosOfRoute(route, 2);
    if (!photos) return this.problem(route, 404, 'catalog.pose-not-found');
    const { photoId } = route.request().postDataJSON() as { photoId: string };
    const index = photos.findIndex((photo) => photo.id === photoId);
    if (index < 0) return this.problem(route, 404, 'catalog.photo-not-found');
    photos.unshift(...photos.splice(index, 1));
    return route.fulfill({ status: 204 });
  }

  private async correct(route: Route) {
    const photo = this.photosOfRoute(route, 2)?.find((stored) => stored.id === this.segment(route, 0));
    if (!photo) return this.problem(route, 404, 'catalog.photo-not-found');
    const body = route.request().postDataJSON() as { altText: string | null; credit: string | null };
    const altText = normalized(body.altText ?? '');
    const credit = normalized(body.credit ?? '');
    if (altText === '') return this.problem(route, 400, 'photo.alt-text-required');
    if (credit === '') return this.problem(route, 400, 'photo.credit-required');
    Object.assign(photo, { altText, credit });
    return route.fulfill({ json: this.response(photo) });
  }

  private async remove(route: Route) {
    const photos = this.photosOfRoute(route, 2);
    if (!photos) return this.problem(route, 404, 'catalog.pose-not-found');
    const index = photos.findIndex((stored) => stored.id === this.segment(route, 0));
    if (index < 0) return this.problem(route, 404, 'catalog.photo-not-found');
    this.removed.add(photos[index]!.id);
    photos.splice(index, 1);
    return route.fulfill({ status: 204 });
  }

  /** A generated size: a small SVG drawn with the proportions of the photo (a square for the thumbnail). */
  private async serve(route: Route) {
    if (this.catalogApi.isUnreachable) return route.abort('connectionrefused');
    const id = this.segment(route, 1);
    const photo = [...this.photos.values()].flat().find((stored) => stored.id === id);
    if (!photo || this.removed.has(id)) return this.problem(route, 404, 'catalog.photo-not-found');
    const square = this.segment(route, 0) === 'thumbnail';
    const width = square ? 160 : Math.round(photo.width / 10);
    const height = square ? 160 : Math.round(photo.height / 10);
    const body =
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
      `<rect width="100%" height="100%" fill="#e8b27a"/><circle cx="50%" cy="45%" r="${Math.min(width, height) / 4}" fill="#5b4a8a"/></svg>`;
    return route.fulfill({ status: 200, contentType: 'image/svg+xml', body });
  }

  private problem(route: Route, status: number, title: string) {
    const body: ProblemDetails = { title, status };
    return route.fulfill({ status, contentType: 'application/problem+json', body: JSON.stringify(body) });
  }
}
