import type { TransitionVideo, VideoFacts } from '../../domain/catalog/transition-videos';
import type { Result } from '../../domain/common/result';
import type { SendingOptions } from './PosePhotosGateway';

// Story 12 « Vidéos des transitions » (ADR 0041). F is the file type of the platform (a File in the browser), opaque to
// core, so that core never depends on the DOM.

/**
 * Port: reads a chosen file (adapter of the site: browserVideoInspector): its format from its first bytes, its weight,
 * its duration and its upright dimensions from its MP4/MOV header, or from the browser (UX-55).
 */
export interface VideoInspector<F> {
  inspect(file: F): Promise<VideoFacts>;
}

/** Why the API did not add, list, correct or remove a video. */
export type TransitionVideosFailure =
  | { readonly kind: 'unauthenticated' }
  | { readonly kind: 'forbidden' }
  /** The transition is not (any longer) in the catalog. */
  | { readonly kind: 'not-found' }
  /** The video was removed meanwhile. */
  | { readonly kind: 'video-not-found' }
  /** Another video took the last place meanwhile. */
  | { readonly kind: 'limit-reached' }
  /** More than 100 MiB (413). */
  | { readonly kind: 'too-large' }
  /** Too many sendings at once on the server (503): to try again later. */
  | { readonly kind: 'busy' }
  /** A content refused by the API: its code (video.too-long…), with the duration measured for video.too-long. */
  | { readonly kind: 'invalid'; readonly code: string; readonly durationSeconds?: number }
  /** The sending was cancelled by the person. */
  | { readonly kind: 'cancelled' }
  | { readonly kind: 'unreachable' }
  | { readonly kind: 'outdated' };

export type AddVideoInput<F> = {
  readonly file: F;
  readonly caption: string;
  readonly credit: string;
  readonly description: string;
  readonly rightsConfirmed: boolean;
};

export type VideoTexts = { readonly caption: string; readonly credit: string; readonly description: string };

/** Port: the videos of a transition in the API (adapter: @acrofunjam/api-client, with the progress of the sending). */
export interface TransitionVideosGateway<F> {
  addVideo(
    transitionId: string,
    input: AddVideoInput<F>,
    options: SendingOptions,
  ): Promise<Result<TransitionVideo, TransitionVideosFailure>>;
  /** Every video of the transition, in every preparation (validators and administrators). */
  listVideos(transitionId: string): Promise<Result<readonly TransitionVideo[], TransitionVideosFailure>>;
  correctVideo(
    transitionId: string,
    videoId: string,
    texts: VideoTexts,
  ): Promise<Result<TransitionVideo, TransitionVideosFailure>>;
  removeVideo(transitionId: string, videoId: string): Promise<Result<void, TransitionVideosFailure>>;
}
