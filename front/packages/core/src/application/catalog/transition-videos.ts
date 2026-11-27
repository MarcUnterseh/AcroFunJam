import {
  checkVideoCaption,
  checkVideoCredit,
  checkVideoDescription,
  checkVideoInput,
  planVideoUpload,
  type TransitionVideo,
  type VideoFacts,
  type VideoInputErrors,
  type VideoUploadPlan,
} from '../../domain/catalog/transition-videos';
import { fail, type Result } from '../../domain/common/result';
import type { SendingOptions } from './PosePhotosGateway';
import type {
  TransitionVideosFailure,
  TransitionVideosGateway,
  VideoInspector,
  VideoTexts,
} from './TransitionVideosGateway';

// Story 12 « Vidéos des transitions » (ADR 0041): adding a video from its page, managing the videos of a transition.

/** Why a file is refused, by the site as soon as it is chosen or by the API. */
export type VideoRefusal =
  | { readonly reason: 'format' | 'too-large' | 'too-short' | 'too-small' }
  /** seconds: the duration measured, truncated (UX-48); unknown when the API does not say it. */
  | { readonly reason: 'too-long'; readonly seconds?: number };

/** What the site tells the validator when a video is not added, corrected or removed. */
export type TransitionVideosError =
  | { readonly kind: 'session-expired' }
  | { readonly kind: 'role-withdrawn' }
  | Exclude<TransitionVideosFailure, { readonly kind: 'unauthenticated' | 'forbidden' | 'too-large' }>
  | ({ readonly kind: 'file-refused' } & VideoRefusal)
  | { readonly kind: 'invalid-input'; readonly errors: VideoInputErrors };

const refusalOfCode: Readonly<Record<string, VideoRefusal['reason']>> = {
  'video.format-not-accepted': 'format',
  'video.too-long': 'too-long',
  'video.too-short': 'too-short',
  'video.too-small': 'too-small',
};

const toError = (failure: TransitionVideosFailure): TransitionVideosError => {
  if (failure.kind === 'unauthenticated') return { kind: 'session-expired' };
  if (failure.kind === 'forbidden') return { kind: 'role-withdrawn' };
  if (failure.kind === 'too-large') return { kind: 'file-refused', reason: 'too-large' };
  const reason = failure.kind === 'invalid' ? refusalOfCode[failure.code] : undefined;
  if (failure.kind === 'invalid' && reason === 'too-long')
    return {
      kind: 'file-refused',
      reason,
      ...(failure.durationSeconds === undefined ? {} : { seconds: failure.durationSeconds }),
    };
  if (reason && reason !== 'too-long') return { kind: 'file-refused', reason };
  return failure;
};

/** What the browser found in the chosen file, and what the site will do with it: checked as soon as it is chosen. */
export const examineVideo = async <F>(
  inspector: VideoInspector<F>,
  file: F,
): Promise<{ readonly facts: VideoFacts; readonly plan: VideoUploadPlan }> => {
  const facts = await inspector.inspect(file);
  return { facts, plan: planVideoUpload(facts) };
};

export type AddTransitionVideoInput<F> = {
  readonly file: F | null;
  readonly caption: string;
  readonly credit: string;
  readonly description: string;
  readonly rightsConfirmed: boolean;
};

/**
 * Adds a video to a transition: every error of the form at once; the file checked as far as the browser can, then sent
 * with its progress. The API answers once its checks are done; the video is then in preparation (V11).
 */
export const addTransitionVideo = async <F>(
  ports: { readonly inspector: VideoInspector<F>; readonly gateway: TransitionVideosGateway<F> },
  transitionId: string,
  input: AddTransitionVideoInput<F>,
  options: SendingOptions,
): Promise<Result<TransitionVideo, TransitionVideosError>> => {
  const errors = checkVideoInput({ ...input, hasFile: input.file !== null });
  if (Object.keys(errors).length > 0 || input.file === null) return fail({ kind: 'invalid-input', errors });

  const { plan } = await examineVideo(ports.inspector, input.file);
  if (plan.kind === 'refuse') return fail({ ...plan, kind: 'file-refused' });

  const answer = await ports.gateway.addVideo(transitionId, { ...input, file: input.file }, options);
  return answer.ok ? answer : fail(toError(answer.error));
};

/** Corrects the caption, the credit and the description, with the rules of an addition (V17, V23). */
export const correctTransitionVideo = async <F>(
  gateway: TransitionVideosGateway<F>,
  transitionId: string,
  videoId: string,
  texts: VideoTexts,
): Promise<Result<TransitionVideo, TransitionVideosError>> => {
  const caption = checkVideoCaption(texts.caption);
  const credit = checkVideoCredit(texts.credit);
  const description = checkVideoDescription(texts.description);
  if (caption || credit || description)
    return fail({
      kind: 'invalid-input',
      errors: {
        ...(caption ? { caption } : {}),
        ...(credit ? { credit } : {}),
        ...(description ? { description } : {}),
      },
    });
  const answer = await gateway.correctVideo(transitionId, videoId, texts);
  return answer.ok ? answer : fail(toError(answer.error));
};

/** Removes a video at once, whatever its preparation (V16). */
export const removeTransitionVideo = async <F>(
  gateway: TransitionVideosGateway<F>,
  transitionId: string,
  videoId: string,
): Promise<Result<void, TransitionVideosError>> => {
  const answer = await gateway.removeVideo(transitionId, videoId);
  return answer.ok ? answer : fail(toError(answer.error));
};

/** The videos of a transition in every preparation: read again while one is being prepared (UX-52). */
export const readTransitionVideos = async <F>(
  gateway: TransitionVideosGateway<F>,
  transitionId: string,
): Promise<Result<readonly TransitionVideo[], TransitionVideosError>> => {
  const answer = await gateway.listVideos(transitionId);
  return answer.ok ? answer : fail(toError(answer.error));
};
