import {
  checkAltText,
  checkPhotoCredit,
  checkPhotoInput,
  maxPhotoBytes,
  planPhotoUpload,
  type PhotoInputErrors,
  type PhotoUploadPlan,
  type PosePhoto,
} from '../../domain/catalog/pose-photos';
import { fail, type Result } from '../../domain/common/result';
import type {
  PhotoFacts,
  PhotoInspector,
  PhotoReducer,
  PosePhotosFailure,
  PosePhotosGateway,
  SendingOptions,
} from './PosePhotosGateway';

// Story 10 « Photos des poses » (ADR 0039): adding a photo from its page, managing the photos of a pose.

/** What the site tells the validator when a photo is not added, corrected, chosen or removed. */
export type PosePhotosError =
  | { readonly kind: 'session-expired' }
  | { readonly kind: 'role-withdrawn' }
  | Exclude<PosePhotosFailure, { readonly kind: 'unauthenticated' | 'forbidden' | 'too-large' }>
  | { readonly kind: 'file-refused'; readonly reason: 'format' | 'too-large' | 'too-small' }
  | { readonly kind: 'invalid-input'; readonly errors: PhotoInputErrors };

export type AddPosePhotoError = PosePhotosError;

const toError = (failure: PosePhotosFailure): PosePhotosError => {
  if (failure.kind === 'unauthenticated') return { kind: 'session-expired' };
  if (failure.kind === 'forbidden') return { kind: 'role-withdrawn' };
  if (failure.kind === 'too-large') return { kind: 'file-refused', reason: 'too-large' };
  return failure;
};

/** What the browser found in the chosen file, and what the site will do with it: checked as soon as it is chosen. */
export const examinePhoto = async <F>(
  inspector: PhotoInspector<F>,
  file: F,
): Promise<{ readonly facts: PhotoFacts; readonly plan: PhotoUploadPlan }> => {
  const facts = await inspector.inspect(file);
  return { facts, plan: planPhotoUpload(facts) };
};

export type AddPosePhotoInput<F> = {
  readonly file: F | null;
  readonly altText: string;
  readonly credit: string;
  readonly rightsConfirmed: boolean;
};

/**
 * Adds a photo to a pose: every error of the form at once; the file checked, reduced when it is too heavy and the browser
 * can read it, then sent with its progress.
 */
export const addPosePhoto = async <F>(
  ports: {
    readonly inspector: PhotoInspector<F>;
    readonly reducer: PhotoReducer<F>;
    readonly gateway: PosePhotosGateway<F>;
  },
  poseId: string,
  input: AddPosePhotoInput<F>,
  options: SendingOptions,
): Promise<Result<PosePhoto, AddPosePhotoError>> => {
  const errors = checkPhotoInput({ ...input, hasFile: input.file !== null });
  if (Object.keys(errors).length > 0 || input.file === null) return fail({ kind: 'invalid-input', errors });

  const { plan } = await examinePhoto(ports.inspector, input.file);
  if (plan.kind === 'refuse') return fail({ kind: 'file-refused', reason: plan.reason });
  let file = input.file;
  if (plan.kind === 'reduce') {
    const reduced = await ports.reducer.reduce(input.file, plan.target);
    if (reduced === null || (await ports.inspector.inspect(reduced)).size > maxPhotoBytes)
      return fail({ kind: 'file-refused', reason: 'too-large' });
    file = reduced;
  }

  const answer = await ports.gateway.addPhoto(
    poseId,
    { file, altText: input.altText, credit: input.credit, rightsConfirmed: input.rightsConfirmed },
    options,
  );
  return answer.ok ? answer : fail(toError(answer.error));
};

export const removePosePhoto = async <F>(
  gateway: PosePhotosGateway<F>,
  poseId: string,
  photoId: string,
): Promise<Result<void, PosePhotosError>> => {
  const answer = await gateway.removePhoto(poseId, photoId);
  return answer.ok ? answer : fail(toError(answer.error));
};

export const choosePosePhotoAsMain = async <F>(
  gateway: PosePhotosGateway<F>,
  poseId: string,
  photoId: string,
): Promise<Result<void, PosePhotosError>> => {
  const answer = await gateway.chooseMainPhoto(poseId, photoId);
  return answer.ok ? answer : fail(toError(answer.error));
};

/** Corrects the alternative text and the credit, with the rules of an addition (R14). */
export const correctPosePhoto = async <F>(
  gateway: PosePhotosGateway<F>,
  poseId: string,
  photoId: string,
  texts: { readonly altText: string; readonly credit: string },
): Promise<Result<PosePhoto, PosePhotosError>> => {
  const altText = checkAltText(texts.altText);
  const credit = checkPhotoCredit(texts.credit);
  if (altText || credit)
    return fail({
      kind: 'invalid-input',
      errors: { ...(altText ? { altText } : {}), ...(credit ? { credit } : {}) },
    });
  const answer = await gateway.correctPhoto(poseId, photoId, texts);
  return answer.ok ? answer : fail(toError(answer.error));
};

