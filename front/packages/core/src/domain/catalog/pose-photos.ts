// Story 10 « Photos des poses » (ADR 0039): the photos of a pose as the site presents them, and what the site checks
// before sending one. The API decides in the end (formats, weight, dimensions, credit that names nobody).

/** The addresses of the sizes the API generated for a photo, under its origin. */
export type PhotoSources = { readonly thumbnail: string; readonly page: string; readonly enlarged: string };

/**
 * A photo of a pose (glossary « Photo »): its alternative text (null when it has none, revision of 2026-11-26), its
 * credit, its upright dimensions, its sizes.
 */
export type PosePhoto = {
  readonly id: string;
  readonly altText: string | null;
  readonly credit: string;
  readonly width: number;
  readonly height: number;
  readonly sources: PhotoSources;
};

/** The formats a photo is accepted in, recognised from its content (R4). */
export type PhotoFormat = 'jpeg' | 'png' | 'webp' | 'heic';

export type PhotoDimensions = { readonly width: number; readonly height: number };

/** At most 5 photos per pose (R11). */
export const maxPhotosPerPose = 5;

/** 10 MiB, as the API (ADR 0039). */
export const maxPhotoBytes = 10 * 1024 * 1024;

/** At least 800 pixels on the shorter side (R6). */
export const minShortSide = 800;

/** The longer side of a photo the site reduces before sending it (ADR 0039). */
export const reducedLongSide = 2400;

export const altTextMaxLength = 200;
export const photoCreditMaxLength = 100;

const startsWith = (content: Uint8Array, offset: number, expected: readonly number[]) =>
  expected.every((value, i) => content[offset + i] === value);

const ascii = (text: string) => [...text].map((c) => c.charCodeAt(0));

/** The brands of an ISO box that announce a HEIC or HEIF photo (an MP4 video has others). */
const heicBrands = ['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'mif1', 'msf1'];

/** The format of a photo from its first bytes (the name of the file is never trusted); null when not accepted. */
export const recognizePhotoFormat = (content: Uint8Array): PhotoFormat | null => {
  if (content.length < 12) return null;
  if (startsWith(content, 0, [0xff, 0xd8, 0xff])) return 'jpeg';
  if (startsWith(content, 0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'png';
  if (startsWith(content, 0, ascii('RIFF')) && startsWith(content, 8, ascii('WEBP'))) return 'webp';
  if (
    startsWith(content, 4, ascii('ftyp')) &&
    heicBrands.some((brand) => startsWith(content, 8, ascii(brand)))
  )
    return 'heic';
  return null;
};

/**
 * The size a photo too heavy is reduced to before sending it: the longer side brought to 2400 pixels, never the shorter
 * side under 800 (a panorama), never enlarged. null: nothing to reduce.
 */
export const reductionTarget = ({ width, height }: PhotoDimensions): PhotoDimensions | null => {
  const long = Math.max(width, height);
  const short = Math.min(width, height);
  if (long <= reducedLongSide) return null;
  const ratio = Math.max(reducedLongSide / long, minShortSide / short);
  if (ratio >= 1) return null;
  return { width: Math.round(width * ratio), height: Math.round(height * ratio) };
};

/** What the site does with the chosen file, before sending it (R4 to R6, decision 5 of the product owner). */
export type PhotoUploadPlan =
  | { readonly kind: 'send' }
  | { readonly kind: 'reduce'; readonly target: PhotoDimensions }
  | { readonly kind: 'refuse'; readonly reason: 'format' | 'too-large' | 'too-small' };

/**
 * @param dimensions the dimensions read by the browser; null when it cannot read the photo (HEIC outside Safari): the API
 * then checks them.
 */
export const planPhotoUpload = (file: {
  readonly format: PhotoFormat | null;
  readonly size: number;
  readonly dimensions: PhotoDimensions | null;
}): PhotoUploadPlan => {
  if (file.format === null) return { kind: 'refuse', reason: 'format' };
  const { dimensions } = file;
  if (dimensions && Math.min(dimensions.width, dimensions.height) < minShortSide)
    return { kind: 'refuse', reason: 'too-small' };
  if (file.size <= maxPhotoBytes) return { kind: 'send' };
  const target = dimensions && reductionTarget(dimensions);
  return target ? { kind: 'reduce', target } : { kind: 'refuse', reason: 'too-large' };
};

/** Counted in characters (code points) once the superfluous spaces are removed, as the API (ADR 0017). */
const normalized = (text: string) => text.normalize('NFC').split(/\s+/u).filter(Boolean).join(' ');
const length = (text: string) => [...text].length;

export type TextError = 'required' | 'too-long';

/** The alternative text is optional (revision of 2026-11-26) and has 200 characters at most (R7). */
export const checkAltText = (text: string): 'too-long' | null =>
  length(normalized(text)) > altTextMaxLength ? 'too-long' : null;

/** The credit is mandatory and has 100 characters at most (R8); a credit naming nobody is the API's refusal. */
export const checkPhotoCredit = (credit: string): TextError | null => {
  const value = normalized(credit);
  if (value.length === 0) return 'required';
  return length(value) > photoCreditMaxLength ? 'too-long' : null;
};

export type PhotoInput = {
  readonly hasFile: boolean;
  readonly altText: string;
  readonly credit: string;
  readonly rightsConfirmed: boolean;
};

export type PhotoInputErrors = {
  readonly file?: 'required';
  readonly altText?: 'too-long';
  readonly credit?: TextError;
  readonly rights?: 'required';
};

/** Every error of the form at once, in its order (photo, alternative text, credit, confirmation of the rights). */
export const checkPhotoInput = (input: PhotoInput): PhotoInputErrors => {
  const altText = checkAltText(input.altText);
  const credit = checkPhotoCredit(input.credit);
  return {
    ...(input.hasFile ? {} : { file: 'required' as const }),
    ...(altText ? { altText } : {}),
    ...(credit ? { credit } : {}),
    ...(input.rightsConfirmed ? {} : { rights: 'required' as const }),
  };
};

/** Another photo can be added while the pose has fewer than 5 (R11). */
export const canAddPhoto = (count: number): boolean => count < maxPhotosPerPose;

/**
 * What removing a photo changes, said in its confirmation: the main photo (the next one takes over), the last one (the
 * pose will have none), or another one.
 */
export const removalConsequence = (
  photos: readonly PosePhoto[],
  photoId: string,
): 'main' | 'last' | 'other' => {
  if (photos.length === 1) return 'last';
  return photos[0]?.id === photoId ? 'main' : 'other';
};

/** The photo enlarged by the address (`?photo=2`, from 1), among so many; null when there is none. */
export const enlargedPhotoIndex = (param: string | null, count: number): number | null => {
  if (param === null || !/^\d+$/.test(param)) return null;
  const position = Number(param);
  return position >= 1 && position <= count ? position - 1 : null;
};
