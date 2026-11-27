import {
  addTransitionVideo,
  canManageVideos,
  checkVideoInput,
  examineVideo,
  posePageLabels,
  transitionVideoLabels as labels,
  videoTransitionName,
  videoCaptionMaxLength,
  videoCreditMaxLength,
  videoDescriptionMaxLength,
  videoErrorMessage,
  videoFileSummary,
  videoRefusalMessage,
  type LinkedTransition,
  type PosePage,
  type TransitionVideosError,
  type VideoFacts,
  type VideoInputErrors,
  type VideoUploadPlan,
} from '@acrofunjam/core';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { Link, Navigate, useBlocker, useNavigate, useParams, useSearchParams } from 'react-router';
import { useSession } from '../identity/SessionContext';
import { useAnnounce } from '../layout/Announcer';
import { FormAlert } from '../layout/form-controls';
import { Icon } from '../layout/Icon';
import { addVideoPath, catalogPath, posePath, signInPath, transitionAnchor } from '../paths';
import { LoadingFailure, PoseNotFound, usePosePage } from './PosePageRoute';
import { TextField } from './PosePhotos';
import { creditNotAnAuthor } from './TransitionVideos';
import { useTransitionVideosPorts } from './TransitionVideosContext';
import { publishedPosesKey } from './usePublishedPoses';

// Story 12 « Vidéos des transitions »: the page « Ajouter une vidéo à Pop to Bird »
// (docs/design/ecrans/12-videos-des-transitions.md § 3, champ-video.md, case-confirmation.md, barre-progression.md;
// V22, UX-55, UX-57, UX-59). The page of the photos, with a video.

type Chosen = {
  readonly file: File;
  readonly facts: VideoFacts;
  readonly plan: VideoUploadPlan;
  readonly preview: string | null;
};

const refusalOf = (chosen: Chosen): string | null =>
  chosen.plan.kind === 'refuse' ? videoRefusalMessage(chosen.plan) : null;

type FieldMessages = {
  readonly file?: string | undefined;
  readonly caption?: string | undefined;
  readonly credit?: string | undefined;
  readonly description?: string | undefined;
  readonly rights?: string | undefined;
};

const fieldMessages = (errors: VideoInputErrors): FieldMessages => ({
  file: errors.file ? labels.fileRequired : undefined,
  caption:
    errors.caption === 'required'
      ? labels.captionRequired
      : errors.caption
        ? labels.captionTooLong
        : undefined,
  credit:
    errors.credit === 'required' ? labels.creditRequired : errors.credit ? labels.creditTooLong : undefined,
  description: errors.description ? labels.descriptionTooLong : undefined,
  rights: errors.rights ? labels.rightsRequired : undefined,
});

type Focus = keyof FieldMessages | 'alert' | 'submit';

const firstInError = (messages: FieldMessages): keyof FieldMessages | null =>
  (['file', 'caption', 'credit', 'description', 'rights'] as const).find(
    (field) => messages[field] !== undefined,
  ) ?? null;

function AddVideoForm({
  poseId,
  transition,
  spokenTitle,
  direction,
}: {
  readonly poseId: string;
  readonly transition: LinkedTransition;
  readonly spokenTitle: string;
  readonly direction: 'from' | 'to';
}) {
  const ports = useTransitionVideosPorts();
  const queryClient = useQueryClient();
  const announce = useAnnounce();
  const navigate = useNavigate();
  const { sessionExpired } = useSession();
  const [chosen, setChosen] = useState<Chosen | null>(null);
  const [previewBroken, setPreviewBroken] = useState(false);
  const [caption, setCaption] = useState('');
  const [credit, setCredit] = useState('');
  const [description, setDescription] = useState('');
  const [rights, setRights] = useState(false);
  const [errors, setErrors] = useState<FieldMessages>({});
  const [failure, setFailure] = useState<TransitionVideosError | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [sending, setSending] = useState<number | null>(null);
  const [focus, setFocus] = useState<Focus | null>(null);
  const inFlight = useRef(false);
  const abort = useRef<AbortController | null>(null);
  const done = useRef(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const alert = useRef<HTMLDivElement>(null);
  const submitButton = useRef<HTMLButtonElement>(null);
  const cancelButton = useRef<HTMLButtonElement>(null);
  const question = useRef<HTMLParagraphElement>(null);
  const ids = {
    file: useId(),
    caption: useId(),
    credit: useId(),
    description: useId(),
    rights: useId(),
    progress: useId(),
    abandon: useId(),
  };
  const back = `${posePath(poseId)}#${transitionAnchor(direction, transition.id)}`;
  /** Before the sending, while the file is sent, then while AcroFunJam checks it (the whole file sent, UX-59). */
  const stage = sending === null ? 'idle' : sending < 1 ? 'sending' : 'checking';

  const dirty = chosen !== null || caption !== '' || credit !== '' || description !== '' || rights;
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirty && !done.current && currentLocation.pathname !== nextLocation.pathname,
  );
  const blocked = blocker.state === 'blocked';

  useEffect(() => () => void (chosen?.preview && URL.revokeObjectURL(chosen.preview)), [chosen]);

  useEffect(() => {
    if (!dirty) return;
    const confirmLeaving = (event: BeforeUnloadEvent) => {
      if (!done.current) event.preventDefault();
    };
    window.addEventListener('beforeunload', confirmLeaving);
    return () => window.removeEventListener('beforeunload', confirmLeaving);
  }, [dirty]);

  useEffect(() => {
    if (focus === null) return;
    const target =
      focus === 'alert'
        ? alert.current
        : focus === 'submit'
          ? submitButton.current
          : focus === 'file'
            ? fileInput.current
            : document.getElementById(ids[focus]);
    target?.focus();
    setFocus(null);
  }, [focus, ids]);

  // The question of the abandon takes the focus; « Continuer l'ajout » gives it back to « Annuler ».
  const wasBlocked = useRef(false);
  useEffect(() => {
    if (blocked) {
      question.current?.focus();
      if (typeof question.current?.scrollIntoView === 'function')
        question.current.scrollIntoView({ block: 'center' });
    } else if (wasBlocked.current) cancelButton.current?.focus();
    wasBlocked.current = blocked;
  }, [blocked]);

  const choose = async (file: File | undefined) => {
    if (!file || inFlight.current) return;
    const { facts, plan } = await examineVideo(ports.inspector, file);
    const preview =
      facts.format && typeof URL.createObjectURL === 'function' ? URL.createObjectURL(file) : null;
    const next = { file, facts, plan, preview };
    setPreviewBroken(false);
    setChosen(next);
    const refusal = refusalOf(next);
    setErrors((current) => ({ ...current, file: refusal ?? undefined }));
    if (refusal) announce(refusal);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (inFlight.current) return;
    setFailure(null);
    const refusal = chosen && refusalOf(chosen);
    if (refusal) {
      const others = fieldMessages(
        checkVideoInput({ hasFile: true, caption, credit, description, rightsConfirmed: rights }),
      );
      setErrors({ ...others, file: refusal });
      setFocus('file');
      return;
    }
    inFlight.current = true;
    abort.current = new AbortController();
    setSending(0);
    // Announced once at the start, once the whole file is sent; never each percentage (O4).
    let checking = false;
    announce(labels.sending);
    const result = await addTransitionVideo(
      ports,
      transition.id,
      { file: chosen?.file ?? null, caption, credit, description, rightsConfirmed: rights },
      {
        onProgress: (sent) => {
          setSending(sent);
          if (sent < 1 || checking) return;
          checking = true;
          announce(labels.checking);
        },
        signal: abort.current.signal,
      },
    );
    inFlight.current = false;
    setSending(null);
    if (result.ok) {
      done.current = true;
      await queryClient.invalidateQueries({ queryKey: publishedPosesKey });
      announce(labels.added(spokenTitle));
      void navigate(back, { replace: true });
      return;
    }
    const error = result.error;
    if (error.kind === 'invalid-input') {
      const messages = fieldMessages(error.errors);
      setErrors(messages);
      setFocus(firstInError(messages));
      return;
    }
    if (error.kind === 'file-refused') {
      setErrors((current) => ({ ...current, file: videoRefusalMessage(error) }));
      setFocus('file');
      return;
    }
    if (error.kind === 'invalid' && error.code === creditNotAnAuthor) {
      setErrors((current) => ({ ...current, credit: labels.creditNotAnAuthor }));
      setFocus('credit');
      return;
    }
    if (error.kind === 'session-expired') sessionExpired();
    setFailure(error);
    setAttempt((n) => n + 1);
    setFocus(error.kind === 'cancelled' ? 'submit' : 'alert');
  };

  return (
    <form className="photo-form" onSubmit={(event) => void submit(event)} noValidate>
      {failure && (
        <FormAlert ref={alert} key={attempt} variant={failure.kind === 'cancelled' ? 'info' : 'error'}>
          <Icon name={failure.kind === 'cancelled' ? 'info' : 'error'} />
          <div className="form-alert__content">
            <p>{videoErrorMessage(failure, spokenTitle)}</p>
          </div>
        </FormAlert>
      )}
      <div className={`photo-field video-field${errors.file ? ' photo-field--invalid' : ''}`}>
        <label className="photo-field__label" htmlFor={ids.file}>
          {labels.video}
        </label>
        <p id={`${ids.file}-help`} className="field__help">
          {labels.videoHelp}
        </p>
        <input
          ref={fileInput}
          id={ids.file}
          className="visually-hidden"
          type="file"
          accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm"
          aria-describedby={[
            `${ids.file}-help`,
            chosen ? `${ids.file}-summary` : null,
            errors.file ? `${ids.file}-error` : null,
          ]
            .filter(Boolean)
            .join(' ')}
          aria-invalid={errors.file ? true : undefined}
          readOnly={sending !== null}
          onChange={(event) => void choose(event.target.files?.[0])}
        />
        {chosen && (
          <>
            {chosen.preview && !previewBroken ? (
              <div className="video-field__preview">
                <video
                  src={chosen.preview}
                  muted
                  playsInline
                  controls
                  preload="metadata"
                  aria-label={labels.previewName}
                  onError={() => setPreviewBroken(true)}
                />
              </div>
            ) : (
              // Without preview: said only for a video AcroFunJam will prepare, not for a refused one (R3).
              chosen.facts.format &&
              !refusalOf(chosen) && (
                <div className="photo-field__unavailable">
                  <Icon name="video" />
                  <span>{labels.previewUnavailable}</span>
                </div>
              )
            )}
            <p id={`${ids.file}-summary`} className="photo-field__summary">
              {videoFileSummary(
                chosen.file.name,
                chosen.facts.size,
                chosen.facts.durationMs,
                chosen.facts.dimensions,
              )}
            </p>
          </>
        )}
        <label
          htmlFor={ids.file}
          className={`button button--secondary ${chosen ? 'photo-field__change' : 'photo-field__choose'}`}
          aria-hidden="true"
        >
          {!chosen && <Icon name="video" />}
          {chosen ? labels.changeVideo : labels.chooseVideo}
        </label>
        {errors.file && (
          <p id={`${ids.file}-error`} className="field__error">
            <Icon name="error" />
            <span>{errors.file}</span>
          </p>
        )}
      </div>
      <TextField
        id={ids.caption}
        label={labels.caption}
        help={`${labels.captionHelp} ${labels.captionExample}`}
        value={caption}
        onChange={setCaption}
        error={errors.caption}
        max={videoCaptionMaxLength}
      />
      <TextField
        id={ids.credit}
        label={labels.credit}
        help={labels.creditHelp}
        value={credit}
        onChange={setCredit}
        error={errors.credit}
        max={videoCreditMaxLength}
      />
      <TextField
        id={ids.description}
        label={
          <>
            {labels.description} <span className="field__optional">{labels.optional}</span>
          </>
        }
        help={`${labels.descriptionHelp} ${labels.descriptionExample}`}
        value={description}
        onChange={setDescription}
        error={errors.description}
        multiline
        max={videoDescriptionMaxLength}
      />
      <div className={`confirm${errors.rights ? ' confirm--invalid' : ''}`}>
        <label className="confirm-box">
          <input
            id={ids.rights}
            type="checkbox"
            checked={rights}
            aria-describedby={[`${ids.rights}-help`, errors.rights ? `${ids.rights}-error` : null]
              .filter(Boolean)
              .join(' ')}
            aria-invalid={errors.rights ? true : undefined}
            onChange={(event) => setRights(event.target.checked)}
          />
          <span>{labels.rights}</span>
        </label>
        <p id={`${ids.rights}-help`} className="field__help">
          {labels.rightsHelp}
        </p>
        {errors.rights && (
          <p id={`${ids.rights}-error`} className="field__error">
            <Icon name="error" />
            <span>{errors.rights}</span>
          </p>
        )}
      </div>
      {sending !== null && (
        <div className="progress">
          <label className="progress__label" htmlFor={ids.progress}>
            <span>{sending < 1 ? labels.sendingProgress : labels.checking}</span>
            {sending < 1 && (
              <span className="progress__value" aria-hidden="true">
                {Math.round(sending * 100)} %
              </span>
            )}
          </label>
          {sending < 1 ? (
            <progress id={ids.progress} max={100} value={Math.round(sending * 100)} />
          ) : (
            <progress id={ids.progress} max={100} />
          )}
        </div>
      )}
      {blocked ? (
        <div className="form-confirm" role="group" aria-labelledby={ids.abandon}>
          <p ref={question} id={ids.abandon} tabIndex={-1}>
            {labels.abandonQuestion}
          </p>
          <div className="zone-actions">
            <button type="button" className="button button--secondary" onClick={() => blocker.proceed?.()}>
              {labels.abandon}
            </button>
            <button type="button" className="button button--secondary" onClick={() => blocker.reset?.()}>
              {labels.continueAdding}
            </button>
          </div>
        </div>
      ) : (
        <div className="form-actions">
          <button
            ref={submitButton}
            type="submit"
            className="button button--primary"
            aria-disabled={sending !== null || undefined}
          >
            {{ idle: labels.submit, sending: labels.sending, checking: labels.checking }[stage]}
          </button>
          {stage === 'sending' && (
            <button type="button" className="button button--secondary" onClick={() => abort.current?.abort()}>
              {labels.cancelSending}
            </button>
          )}
          {/* Once the whole file is sent, AcroFunJam checks it: nothing left to cancel (O3). */}
          {stage === 'idle' && (
            <button
              ref={cancelButton}
              type="button"
              className="button button--secondary"
              onClick={() => void navigate(back, { replace: true })}
            >
              {labels.cancel}
            </button>
          )}
        </div>
      )}
    </form>
  );
}

/** The transition of the page, in the section it was opened from, with what names it. */
const transitionOf = (page: PosePage, transitionId: string, direction: 'from' | 'to') => {
  const transitions = direction === 'from' ? page.transitionsFrom : page.transitionsTo;
  const transition = transitions.find((candidate) => candidate.id === transitionId);
  if (!transition) return null;
  const [from, to] =
    direction === 'from' ? [page.name, transition.otherPose.name] : [transition.otherPose.name, page.name];
  return { transition, spokenTitle: videoTransitionName({ name: transition.name, from, to }) };
};

/**
 * The page « Ajouter une vidéo à Pop to Bird », for the validators and the administrators: a visitor is sent to the
 * sign-in page and comes back here, a user to the catalog. As the page of the pose: loading, failure with « Réessayer »,
 * « Pose introuvable », a transition no longer in the catalog, or the form.
 */
export function AddVideoPage() {
  const { id: poseId = '', transitionId = '' } = useParams();
  const [searchParams] = useSearchParams();
  const direction = searchParams.get('section') === 'vers' ? 'to' : 'from';
  const { session } = useSession();
  const { data: page, error, refetch } = usePosePage(poseId);
  const announce = useAnnounce();
  const [retrying, setRetrying] = useState(false);
  const title = useRef<HTMLHeadingElement>(null);
  const titleFocused = useRef(false);
  const notFound = page === undefined && error?.failure.kind === 'not-found';
  const found = page ? transitionOf(page, transitionId, direction) : null;
  const name = found?.spokenTitle;

  useEffect(() => {
    if (name) document.title = `${labels.addPageTitle(name)} – AcroFunJam`;
    else if (notFound) document.title = `${posePageLabels.notFoundTitle} – AcroFunJam`;
  }, [name, notFound]);

  useEffect(() => {
    if (!name || titleFocused.current) return;
    titleFocused.current = true;
    title.current?.focus();
  }, [name]);

  const retry = async () => {
    setRetrying(true);
    const result = await refetch();
    setRetrying(false);
    if (result.isError) announce(posePageLabels.loadingFailed);
  };

  if (session.status === 'visitor' && session.notice !== 'expired')
    return <Navigate to={signInPath(addVideoPath(poseId, transitionId, direction))} replace />;
  if (session.status === 'signedIn' && !canManageVideos(session))
    return <Navigate to={catalogPath} replace />;

  if (notFound)
    return (
      <section className="photo-page">
        <Link to={catalogPath} className="back-link">
          <Icon name="chevronLeft" />
          {posePageLabels.back}
        </Link>
        <PoseNotFound />
      </section>
    );

  return (
    <section className="photo-page">
      <Link to={posePath(poseId)} className="back-link">
        <Icon name="chevronLeft" />
        {page?.name ?? labels.back}
      </Link>
      <h1 ref={title} tabIndex={-1}>
        {name ? labels.addPageTitle(name) : labels.addVideo}
      </h1>
      {page && found ? (
        <>
          <p className="photo-page__intro">{labels.allFieldsRequired}</p>
          <AddVideoForm
            poseId={poseId}
            transition={found.transition}
            spokenTitle={found.spokenTitle}
            direction={direction}
          />
        </>
      ) : page ? (
        <p>{labels.transitionNotFound}</p>
      ) : error || retrying ? (
        <LoadingFailure
          outdated={error?.failure.kind === 'outdated'}
          retrying={retrying}
          onRetry={() => void retry()}
        />
      ) : (
        <p role="status" className="catalog__status">
          {posePageLabels.loading}
        </p>
      )}
    </section>
  );
}
