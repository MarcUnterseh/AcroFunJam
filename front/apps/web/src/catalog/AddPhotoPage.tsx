import {
  addPosePhoto,
  altTextMaxLength,
  canManagePhotos,
  checkPhotoInput,
  examinePhoto,
  photoCreditMaxLength,
  photoErrorMessage,
  photoFileSummary,
  posePageLabels,
  posePhotoLabels as labels,
  type PhotoFacts,
  type PhotoInputErrors,
  type PhotoUploadPlan,
  type PosePhotosError,
} from '@acrofunjam/core';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { Link, Navigate, useBlocker, useNavigate, useParams } from 'react-router';
import { useSession } from '../identity/SessionContext';
import { useAnnounce } from '../layout/Announcer';
import { FormAlert } from '../layout/form-controls';
import { Icon } from '../layout/Icon';
import { catalogPath, addPhotoPath, posePath, signInPath } from '../paths';
import { LoadingFailure, PoseNotFound, usePosePage } from './PosePageRoute';
import { usePosePhotosPorts } from './PosePhotosContext';
import { creditNotAnAuthor, TextField } from './PosePhotos';
import { publishedPosesKey } from './usePublishedPoses';

// Story 10 « Photos des poses »: the page « Ajouter une photo de Throne » (docs/design/ecrans/10-photos-des-poses.md § 4,
// champ-photo.md, case-confirmation.md, barre-progression.md; UX-16 to UX-23).

type Chosen = {
  readonly file: File;
  readonly facts: PhotoFacts;
  readonly plan: PhotoUploadPlan;
  readonly preview: string | null;
};

/** The message under the field « Photo » for a file refused as soon as it is chosen. */
const refusalOf = (chosen: Chosen): string | null => {
  if (chosen.plan.kind !== 'refuse') return null;
  if (chosen.plan.reason === 'format') return labels.formatRefused;
  if (chosen.plan.reason === 'too-small' && chosen.facts.dimensions)
    return labels.tooSmallMeasured(chosen.facts.dimensions.width, chosen.facts.dimensions.height);
  return chosen.plan.reason === 'too-small' ? labels.tooSmall : labels.tooLarge;
};

type FieldMessages = {
  readonly file?: string | undefined;
  readonly altText?: string | undefined;
  readonly credit?: string | undefined;
  readonly rights?: string | undefined;
};

const fieldMessages = (errors: PhotoInputErrors): FieldMessages => ({
  file: errors.file ? labels.fileRequired : undefined,
  altText:
    errors.altText === 'required'
      ? labels.altTextRequired
      : errors.altText
        ? labels.altTextTooLong
        : undefined,
  credit:
    errors.credit === 'required' ? labels.creditRequired : errors.credit ? labels.creditTooLong : undefined,
  rights: errors.rights ? labels.rightsRequired : undefined,
});

/** What takes the focus after a sending: the first field in error, the alert, or « Ajouter la photo ». */
type Focus = keyof FieldMessages | 'alert' | 'submit';

const firstInError = (messages: FieldMessages): keyof FieldMessages | null =>
  (['file', 'altText', 'credit', 'rights'] as const).find((field) => messages[field] !== undefined) ?? null;

function AddPhotoForm({ poseId, poseName }: { readonly poseId: string; readonly poseName: string }) {
  const ports = usePosePhotosPorts();
  const queryClient = useQueryClient();
  const announce = useAnnounce();
  const navigate = useNavigate();
  const { sessionExpired } = useSession();
  const [chosen, setChosen] = useState<Chosen | null>(null);
  const [altText, setAltText] = useState('');
  const [credit, setCredit] = useState('');
  const [rights, setRights] = useState(false);
  const [errors, setErrors] = useState<FieldMessages>(fieldMessages({}));
  const [failure, setFailure] = useState<PosePhotosError | null>(null);
  // A new alert node for each failure: an identical failure is announced again.
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
    altText: useId(),
    credit: useId(),
    rights: useId(),
    progress: useId(),
    abandon: useId(),
  };

  const dirty = chosen !== null || altText !== '' || credit !== '' || rights;
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirty && !done.current && currentLocation.pathname !== nextLocation.pathname,
  );

  useEffect(() => () => void (chosen?.preview && URL.revokeObjectURL(chosen.preview)), [chosen]);

  // Closing or reloading the tab with an input: the browser asks to confirm, until a photo is added.
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

  // The element that had the focus when leaving was asked (« Annuler », the link back, a link of the header…).
  const lastFocused = useRef<HTMLElement | null>(null);
  const blocked = blocker.state === 'blocked';
  const asking = useRef(false);
  useEffect(() => {
    // Not while the question is asked: its own buttons are not where the person was.
    const remember = (event: FocusEvent) => {
      if (!asking.current && event.target instanceof HTMLElement) lastFocused.current = event.target;
    };
    document.addEventListener('focusin', remember);
    return () => document.removeEventListener('focusin', remember);
  }, []);

  // The question appears where « Annuler » was, maybe far from the link that asked to leave: brought into view.
  const wasBlocked = useRef(false);
  useEffect(() => {
    asking.current = blocked;
    if (blocked) {
      const element = question.current;
      element?.focus();
      if (typeof element?.scrollIntoView === 'function') element.scrollIntoView({ block: 'center' });
    } else if (wasBlocked.current) {
      // « Continuer l'ajout »: back to where the person was, or to « Annuler », which the question replaced.
      const previous = lastFocused.current;
      if (previous?.isConnected) previous.focus();
      else cancelButton.current?.focus();
    }
    wasBlocked.current = blocked;
  }, [blocked]);

  const choose = async (file: File | undefined) => {
    // The photo being sent stays the one chosen.
    if (!file || inFlight.current) return;
    const { facts, plan } = await examinePhoto(ports.inspector, file);
    const preview =
      facts.dimensions && typeof URL.createObjectURL === 'function' ? URL.createObjectURL(file) : null;
    const next = { file, facts, plan, preview };
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
      // The file refused, and the other fields in error with it: every error at once.
      const others = fieldMessages(
        checkPhotoInput({ hasFile: true, altText, credit, rightsConfirmed: rights }),
      );
      setErrors({ ...others, file: refusal });
      setFocus('file');
      return;
    }
    inFlight.current = true;
    abort.current = new AbortController();
    setSending(0);
    const result = await addPosePhoto(
      ports,
      poseId,
      { file: chosen?.file ?? null, altText, credit, rightsConfirmed: rights },
      { onProgress: (sent) => setSending(sent), signal: abort.current.signal },
    );
    inFlight.current = false;
    setSending(null);
    if (result.ok) {
      done.current = true;
      await queryClient.invalidateQueries({ queryKey: publishedPosesKey });
      announce(labels.added(poseName));
      void navigate(posePath(poseId), { replace: true });
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
      setErrors((current) => ({ ...current, file: photoErrorMessage(error, poseName) }));
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
    // Cancelled by the person: nothing went wrong, « Ajouter la photo » is there to send it again.
    setFocus(error.kind === 'cancelled' ? 'submit' : 'alert');
  };

  return (
    <form className="photo-form" onSubmit={(event) => void submit(event)} noValidate>
      {failure &&
        (failure.kind === 'cancelled' ? (
          <FormAlert ref={alert} key={attempt} variant="info">
            <Icon name="info" />
            <div className="form-alert__content">
              <p>{photoErrorMessage(failure, poseName)}</p>
            </div>
          </FormAlert>
        ) : (
          <FormAlert ref={alert} key={attempt}>
            <Icon name="error" />
            <div className="form-alert__content">
              <p>{photoErrorMessage(failure, poseName)}</p>
            </div>
          </FormAlert>
        ))}
      <div className={`photo-field${errors.file ? ' photo-field--invalid' : ''}`}>
        <label className="photo-field__label" htmlFor={ids.file}>
          {labels.photo}
        </label>
        <p id={`${ids.file}-help`} className="field__help">
          {labels.photoHelp}
        </p>
        <input
          ref={fileInput}
          id={ids.file}
          className="visually-hidden"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
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
            {chosen.preview ? (
              <div className="photo-field__preview">
                <img className="photo-img" src={chosen.preview} alt="" />
              </div>
            ) : (
              chosen.facts.format === 'heic' && (
                <div className="photo-field__unavailable">
                  <Icon name="photo" />
                  <span>{labels.heicPreviewUnavailable}</span>
                </div>
              )
            )}
            <p id={`${ids.file}-summary`} className="photo-field__summary">
              {photoFileSummary(chosen.file.name, chosen.facts.size, chosen.facts.dimensions)}
            </p>
          </>
        )}
        <label
          htmlFor={ids.file}
          className={`button button--secondary ${chosen ? 'photo-field__change' : 'photo-field__choose'}`}
          aria-hidden="true"
        >
          {!chosen && <Icon name="photo" />}
          {chosen ? labels.changePhoto : labels.choosePhoto}
        </label>
        {errors.file && (
          <p id={`${ids.file}-error`} className="field__error">
            <Icon name="error" />
            <span>{errors.file}</span>
          </p>
        )}
      </div>
      <TextField
        id={ids.altText}
        label={labels.altText}
        help={`${labels.altTextHelp} ${labels.altTextExample}`}
        value={altText}
        onChange={setAltText}
        error={errors.altText}
        multiline
        max={altTextMaxLength}
      />
      <TextField
        id={ids.credit}
        label={labels.credit}
        help={labels.creditHelp}
        value={credit}
        onChange={setCredit}
        error={errors.credit}
        max={photoCreditMaxLength}
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
            <span>{sending < 1 ? labels.sendingProgress : labels.preparing}</span>
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
            {sending !== null ? labels.sending : labels.submit}
          </button>
          {sending !== null ? (
            <button type="button" className="button button--secondary" onClick={() => abort.current?.abort()}>
              {labels.cancelSending}
            </button>
          ) : (
            <button
              ref={cancelButton}
              type="button"
              className="button button--secondary"
              onClick={() => void navigate(posePath(poseId), { replace: true })}
            >
              {labels.cancel}
            </button>
          )}
        </div>
      )}
    </form>
  );
}

/** The link back at the top of the page: to the pose once it is known, to the catalog when it is not found. */
function BackLink({
  poseId,
  name,
  notFound,
}: {
  poseId: string;
  name?: string | undefined;
  notFound: boolean;
}) {
  return (
    <Link to={notFound ? catalogPath : posePath(poseId)} className="back-link">
      <Icon name="chevronLeft" />
      {name ?? (notFound ? posePageLabels.back : labels.back)}
    </Link>
  );
}

/**
 * The page « Ajouter une photo de Throne », for the validators and the administrators: a visitor is sent to the sign-in
 * page and comes back here, a user is sent to the catalog. As the page of the pose: loading, failure with « Réessayer »,
 * « Pose introuvable », or the form.
 */
export function AddPhotoPage() {
  const { id: poseId = '' } = useParams();
  const { session } = useSession();
  const { data: page, error, refetch } = usePosePage(poseId);
  const announce = useAnnounce();
  const [retrying, setRetrying] = useState(false);
  const title = useRef<HTMLHeadingElement>(null);
  const titleFocused = useRef(false);
  const notFound = page === undefined && error?.failure.kind === 'not-found';

  const name = page?.name;
  useEffect(() => {
    if (name) document.title = `${labels.addPageTitle(name)} – AcroFunJam`;
    else if (notFound) document.title = `${posePageLabels.notFoundTitle} – AcroFunJam`;
  }, [name, notFound]);

  // The title names the pose once it is read: it takes the focus then, once.
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
    return <Navigate to={signInPath(addPhotoPath(poseId))} replace />;
  if (session.status === 'signedIn' && !canManagePhotos(session))
    return <Navigate to={catalogPath} replace />;

  if (notFound)
    return (
      <section className="photo-page">
        <BackLink poseId={poseId} notFound />
        <PoseNotFound />
      </section>
    );

  return (
    <section className="photo-page">
      <BackLink poseId={poseId} name={name} notFound={false} />
      <h1 ref={title} tabIndex={-1}>
        {name ? labels.addPageTitle(name) : labels.addPhoto}
      </h1>
      {page ? (
        <>
          <p className="photo-page__intro">{labels.allFieldsRequired}</p>
          <AddPhotoForm poseId={poseId} poseName={page.name} />
        </>
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
