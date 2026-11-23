import type { PhotoDimensions, PhotoFormat, PosePhoto } from '../../domain/catalog/pose-photos';
import type { Result } from '../../domain/common/result';

// Story 10 « Photos des poses » (ADR 0039). F is the file type of the platform (a File in the browser), opaque to core,
// so that core never depends on the DOM.

/** What the platform finds in a chosen file: its format from its first bytes, its weight, its dimensions when it can. */
export type PhotoFacts = {
  readonly format: PhotoFormat | null;
  readonly size: number;
  /** null: the platform cannot read the photo (HEIC outside Safari): the API checks the dimensions. */
  readonly dimensions: PhotoDimensions | null;
};

/** Port: reads a chosen file (adapter of the site: browserPhotoInspector). */
export interface PhotoInspector<F> {
  inspect(file: F): Promise<PhotoFacts>;
}

/** Port: reduces a photo the platform can read to these dimensions, in JPEG (adapter of the site: canvasPhotoReducer). */
export interface PhotoReducer<F> {
  reduce(file: F, target: PhotoDimensions): Promise<F | null>;
}

/** Why the API did not add, remove, choose or correct a photo. */
export type PosePhotosFailure =
  | { readonly kind: 'unauthenticated' }
  | { readonly kind: 'forbidden' }
  /** The pose is not (any longer) in the catalog. */
  | { readonly kind: 'not-found' }
  /** The photo was removed meanwhile. */
  | { readonly kind: 'photo-not-found' }
  /** Another photo took the last place meanwhile. */
  | { readonly kind: 'limit-reached' }
  /** More than 10 MiB (413). */
  | { readonly kind: 'too-large' }
  /** A content refused by the API: its code (photo.too-small, photo.credit-not-an-author…). */
  | { readonly kind: 'invalid'; readonly code: string }
  /** The sending was cancelled by the person. */
  | { readonly kind: 'cancelled' }
  | { readonly kind: 'unreachable' }
  | { readonly kind: 'outdated' };

export type AddPhotoInput<F> = {
  readonly file: F;
  readonly altText: string;
  readonly credit: string;
  readonly rightsConfirmed: boolean;
};

export type SendingOptions = {
  /** From 0 to 1, while the file is sent. */
  readonly onProgress?: (sent: number) => void;
  readonly signal?: AbortSignal;
};

/** Port: the photos of a pose in the API (adapter: @acrofunjam/api-client, with the progress of the sending). */
export interface PosePhotosGateway<F> {
  addPhoto(
    poseId: string,
    input: AddPhotoInput<F>,
    options: SendingOptions,
  ): Promise<Result<PosePhoto, PosePhotosFailure>>;
  removePhoto(poseId: string, photoId: string): Promise<Result<void, PosePhotosFailure>>;
  chooseMainPhoto(poseId: string, photoId: string): Promise<Result<void, PosePhotosFailure>>;
  correctPhoto(
    poseId: string,
    photoId: string,
    texts: { readonly altText: string; readonly credit: string },
  ): Promise<Result<PosePhoto, PosePhotosFailure>>;
}
