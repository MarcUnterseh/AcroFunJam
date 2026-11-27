import {
  altTextMaxLength,
  canAddPhoto,
  checkAltText,
  checkPhotoCredit,
  choosePosePhotoAsMain,
  correctPosePhoto,
  enlargedPhotoAnnouncement,
  enlargedPhotoTitle,
  morePhotosLink,
  photoCountLabel,
  photoCreditLabel,
  photoCreditMaxLength,
  photoDescription,
  photoManagementErrorMessage,
  posePhotoLabels as labels,
  removalConsequence,
  removalConsequenceText,
  removePosePhoto,
  type PosePage,
  type PosePhoto,
  type PosePhotosError,
} from '@acrofunjam/core';
import { useQueryClient } from '@tanstack/react-query';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';
import { Link } from 'react-router';
import { useSession } from '../identity/SessionContext';
import { useAnnounce } from '../layout/Announcer';
import { FormAlert } from '../layout/form-controls';
import { Icon } from '../layout/Icon';
import { addPhotoPath } from '../paths';
import { usePosePhotosPorts } from './PosePhotosContext';
import { publishedPosesKey } from './usePublishedPoses';

// Story 10 « Photos des poses » (docs/design/ecrans/10-photos-des-poses.md, galerie-photos.md): the main photo at the top
// of the body, the others in the last section of the page, the enlargement, and their management by the validators.

/** The anchor of the section « Autres photos de Bird », target of the link under the main photo. */
export const otherPhotosAnchor = 'autres-photos';

/** The title « Photos de Bird », at the top of the body (tabindex -1: it takes the focus after a removal). */
const mainPhotosTitleId = 'photos-title';
const otherPhotosTitleId = `${otherPhotosAnchor}-title`;

/** The refusal of a credit that does not name the author (« inconnu »…): an error of the field « Crédit ». */
export const creditNotAnAuthor = 'photo.credit-not-an-author';

/** The id of the button that enlarges a photo: the focus comes back to it. */
export const enlargeButtonId = (photoId: string) => `agrandir-${photoId}`;

type FocusTarget = () => HTMLElement | null;

/**
 * A change of the photos (removal, new main photo) or of the videos of a transition (removal) moves or removes the button
 * that had the focus: the target is focused once the page is read again, or after the next frame when the page read
 * again is the same.
 */
const PhotoFocusContext = createContext<{
  readonly expect: (target: FocusTarget) => void;
  readonly settle: () => void;
}>({ expect: () => {}, settle: () => {} });

/** The focus to give once the page of the pose is read again (inside PhotoFocus). */
export const usePendingFocus = () => useContext(PhotoFocusContext);

export function PhotoFocus({ page, children }: { readonly page: PosePage; readonly children: ReactNode }) {
  const pending = useRef<FocusTarget | null>(null);
  const settle = useCallback(() => {
    const target = pending.current?.();
    if (!target) return;
    pending.current = null;
    target.focus();
  }, []);
  const expect = useCallback((target: FocusTarget) => {
    pending.current = target;
  }, []);
  useEffect(settle, [page, settle]);
  return (
    <PhotoFocusContext.Provider value={{ expect, settle: () => requestAnimationFrame(settle) }}>
      {children}
    </PhotoFocusContext.Provider>
  );
}

/**
 * A photo, entire on its mat, a button that enlarges it; its credit under it. Described by its alternative text, or by
 * its rank and its pose when it has none.
 */
function PhotoFigure({
  photo,
  description,
  main = false,
  onEnlarge,
}: {
  readonly photo: PosePhoto;
  readonly description: string;
  readonly main?: boolean;
  readonly onEnlarge: () => void;
}) {
  const [broken, setBroken] = useState(false);
  return (
    <figure className={`pose-photo${main ? ' pose-photo--main' : ''}`}>
      <button
        id={enlargeButtonId(photo.id)}
        type="button"
        className="pose-photo__enlarge"
        aria-label={labels.enlarge(description)}
        onClick={onEnlarge}
      >
        {broken ? (
          <span className="pose-photo__unavailable">{labels.unavailable}</span>
        ) : (
          <img
            className="photo-img"
            src={photo.sources.page}
            alt={description}
            width={photo.width}
            height={photo.height}
            loading={main ? 'eager' : 'lazy'}
            fetchPriority={main ? 'high' : 'auto'}
            onError={() => setBroken(true)}
          />
        )}
        <span className="pose-photo__zoom" aria-hidden="true">
          <Icon name="zoom" />
        </span>
      </button>
      <figcaption className="pose-photo__credit">{photoCreditLabel(photo.credit)}</figcaption>
    </figure>
  );
}

/** « Ajouter une photo » and « 2 photos sur 5 », or the sentence of the maximum. */
function ManagementFooter({
  page,
  photos,
}: {
  readonly page: PosePage;
  readonly photos: readonly PosePhoto[];
}) {
  return (
    <div className="pose-photos__manage">
      {canAddPhoto(photos.length) ? (
        <>
          <Link
            to={addPhotoPath(page.id)}
            className="button button--secondary link-button"
            aria-label={labels.addPhotoName(page.name)}
          >
            <Icon name="plus" />
            {labels.addPhoto}
          </Link>
          {/* Without photo, « Bird n'a pas encore de photo. » says it: no « 0 photo sur 5 ». */}
          {photos.length > 0 && <p className="pose-photos__count">{photoCountLabel(photos.length)}</p>}
        </>
      ) : (
        <p className="pose-photos__max">{labels.maximumReached(page.name)}</p>
      )}
    </div>
  );
}

type Zone = 'actions' | 'correcting' | 'removing';

/**
 * The management of a photo (validators and administrators): « Choisir comme photo principale » (not for the main photo),
 * « Modifier » the texts in place, « Retirer » after a confirmation saying what it changes.
 */
function PhotoManagement({
  page,
  photos,
  photo,
}: {
  readonly page: PosePage;
  readonly photos: readonly PosePhoto[];
  readonly photo: PosePhoto;
}) {
  const { gateway } = usePosePhotosPorts();
  const queryClient = useQueryClient();
  const announce = useAnnounce();
  const { sessionExpired } = useSession();
  const [zone, setZone] = useState<Zone>('actions');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<PosePhotosError | null>(null);
  const [altText, setAltText] = useState(photo.altText ?? '');
  const [credit, setCredit] = useState(photo.credit);
  const [fieldErrors, setFieldErrors] = useState<{ altText?: string; credit?: string }>({});
  const questionId = useId();
  const correctTitleId = useId();
  const altTextId = useId();
  const creditId = useId();
  const isMain = photos[0]?.id === photo.id;
  const description = photoDescription(photo, photos.findIndex((p) => p.id === photo.id) + 1, page.name);
  const focus = useContext(PhotoFocusContext);
  const question = useRef<HTMLParagraphElement>(null);
  const correctButton = useRef<HTMLButtonElement>(null);
  const removeButton = useRef<HTMLButtonElement>(null);
  const left = useRef<Zone>('actions');

  // Opening a zone gives the focus to its question or its first field; closing it gives it back to its button.
  useEffect(() => {
    if (zone === 'removing') question.current?.focus();
    else if (zone === 'correcting') document.getElementById(altTextId)?.focus();
    else if (left.current === 'correcting') correctButton.current?.focus();
    else if (left.current === 'removing') removeButton.current?.focus();
    left.current = zone;
  }, [zone, altTextId]);

  /** Announces the change and reads the page again; the focus goes to the target once it is read. */
  const done = async (message: string, target?: FocusTarget) => {
    announce(message);
    if (target) focus.expect(target);
    await queryClient.invalidateQueries({ queryKey: publishedPosesKey });
    if (target) focus.settle();
  };

  const failed = (failure: PosePhotosError) => {
    if (failure.kind === 'session-expired') sessionExpired();
    setError(failure);
  };

  const choose = async () => {
    setBusy(true);
    const result = await choosePosePhotoAsMain(gateway, page.id, photo.id);
    setBusy(false);
    if (!result.ok) return failed(result.error);
    // The photo goes to the top of the body: the focus follows it.
    await done(labels.mainChosen(description, page.name), () =>
      document.getElementById(enlargeButtonId(photo.id)),
    );
  };

  const remove = async () => {
    setBusy(true);
    const result = await removePosePhoto(gateway, page.id, photo.id);
    setBusy(false);
    if (!result.ok) return failed(result.error);
    // The photo and its buttons go away: the focus goes to the title of its section, or of the top without other photos.
    await done(
      labels.removed(page.name),
      () =>
        (isMain ? null : document.getElementById(otherPhotosTitleId)) ??
        document.getElementById(mainPhotosTitleId),
    );
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    const altTextError = checkAltText(altText);
    const creditError = checkPhotoCredit(credit);
    setFieldErrors({
      ...(altTextError ? { altText: labels.altTextTooLong } : {}),
      ...(creditError
        ? { credit: creditError === 'required' ? labels.creditRequired : labels.creditTooLong }
        : {}),
    });
    if (altTextError || creditError) return;
    setBusy(true);
    const result = await correctPosePhoto(gateway, page.id, photo.id, { altText, credit });
    setBusy(false);
    if (!result.ok && result.error.kind === 'invalid' && result.error.code === creditNotAnAuthor) {
      setFieldErrors({ credit: labels.creditNotAnAuthorWhenCorrecting });
      document.getElementById(creditId)?.focus();
      return;
    }
    if (!result.ok) return failed(result.error);
    setZone('actions');
    await done(labels.corrected);
  };

  const alert = error && (
    <FormAlert>
      <Icon name="error" />
      <div className="form-alert__content">
        <p>{photoManagementErrorMessage(error, page.name)}</p>
      </div>
    </FormAlert>
  );

  if (zone === 'removing')
    return (
      <div className="pose-photo__zone" role="group" aria-labelledby={questionId}>
        <p ref={question} id={questionId} className="pose-photo__zone-title" tabIndex={-1}>
          {labels.removeQuestion(page.name)}
        </p>
        <p className="pose-photo__zone-text">
          {removalConsequenceText(removalConsequence(photos, photo.id), page.name)}
        </p>
        {alert}
        <div className="zone-actions">
          <button
            type="button"
            className="button button--secondary"
            aria-disabled={busy || undefined}
            onClick={() => (busy ? undefined : void remove())}
          >
            {busy ? labels.removing : labels.removeConfirm}
          </button>
          <button type="button" className="button button--secondary" onClick={() => setZone('actions')}>
            {labels.cancel}
          </button>
        </div>
      </div>
    );

  if (zone === 'correcting')
    return (
      <form
        className="pose-photo__zone"
        role="group"
        aria-labelledby={correctTitleId}
        onSubmit={(e) => void save(e)}
        noValidate
      >
        <p id={correctTitleId} className="pose-photo__zone-title">
          {labels.correctTitle}
        </p>
        {alert}
        <TextField
          id={altTextId}
          label={labels.altText}
          help={`${labels.altTextHelp} ${labels.altTextExample}`}
          value={altText}
          onChange={setAltText}
          error={fieldErrors.altText}
          multiline
          max={altTextMaxLength}
        />
        <TextField
          id={creditId}
          label={labels.credit}
          help={labels.creditHelp}
          value={credit}
          onChange={setCredit}
          error={fieldErrors.credit}
          max={photoCreditMaxLength}
        />
        <div className="zone-actions">
          <button type="submit" className="button button--primary" aria-disabled={busy || undefined}>
            {busy ? labels.saving : labels.save}
          </button>
          <button type="button" className="button button--secondary" onClick={() => setZone('actions')}>
            {labels.cancel}
          </button>
        </div>
      </form>
    );

  return (
    <>
      {alert}
      <div className="pose-photo__actions">
        {!isMain && (
          <button
            type="button"
            className="button button--secondary button--small"
            aria-disabled={busy || undefined}
            onClick={() => (busy ? undefined : void choose())}
          >
            <span aria-hidden="true">{labels.chooseAsMain}</span>
            <span className="visually-hidden">{labels.chooseAsMainName(description)}</span>
          </button>
        )}
        <button
          ref={correctButton}
          type="button"
          className="button button--secondary button--small"
          onClick={() => {
            setAltText(photo.altText ?? '');
            setCredit(photo.credit);
            setFieldErrors({});
            setError(null);
            setZone('correcting');
          }}
        >
          <span aria-hidden="true">{labels.correct}</span>
          <span className="visually-hidden">{labels.correctName(description)}</span>
        </button>
        <button
          ref={removeButton}
          type="button"
          className="button button--secondary button--small"
          onClick={() => {
            setError(null);
            setZone('removing');
          }}
        >
          <span aria-hidden="true">{labels.remove}</span>
          <span className="visually-hidden">{labels.removeName(description)}</span>
        </button>
      </div>
    </>
  );
}

/** A labelled field with its help and its error (champ.md), for the correction in place. */
export function TextField({
  id,
  label,
  help,
  value,
  onChange,
  error,
  multiline = false,
  max,
}: {
  readonly id: string;
  /** Text, or text with « (facultative) » out of bold (.field__optional). */
  readonly label: ReactNode;
  readonly help: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly error?: string | undefined;
  readonly multiline?: boolean;
  readonly max?: number;
}) {
  const helpId = `${id}-help`;
  const errorId = `${id}-error`;
  const counterId = `${id}-counter`;
  const describedBy = [helpId, max ? counterId : null, error ? errorId : null].filter(Boolean).join(' ');
  const props = {
    id,
    value,
    'aria-describedby': describedBy,
    'aria-invalid': error ? true : undefined,
    onChange: (event: { target: { value: string } }) => onChange(event.target.value),
  };
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <p id={helpId} className="field__help">
        {help}
      </p>
      {multiline ? <textarea rows={4} {...props} /> : <input type="text" {...props} />}
      {max && (
        <p id={counterId} className="field__counter">
          {[...value].length} / {max}
        </p>
      )}
      {error && (
        <p id={errorId} className="field__error">
          <Icon name="error" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}

/**
 * The top of the body: « Photos de Bird », the safety note, the main photo entire, its credit; for a validator its mark and
 * its management; the link down to the other photos. A pose without photo: nothing for a visitor, the invitation for a
 * validator.
 */
export function MainPhotoSection({
  page,
  manages,
  safetyNote,
  onEnlarge,
}: {
  readonly page: PosePage;
  readonly manages: boolean;
  readonly safetyNote: ReactNode;
  readonly onEnlarge: (index: number) => void;
}) {
  const photos = page.photos ?? [];
  const main = photos[0];
  if (!main && !manages) return null;
  return (
    <section className="pose-photos" aria-labelledby={mainPhotosTitleId}>
      <h2 id={mainPhotosTitleId} className="pose-page__section-title" tabIndex={-1}>
        {labels.sectionTitle(page.name)}
      </h2>
      {main ? (
        <div className="pose-photos__lead">
          {safetyNote}
          <div className="pose-photo-item">
            <PhotoFigure
              photo={main}
              description={photoDescription(main, 1, page.name)}
              main
              onEnlarge={() => onEnlarge(0)}
            />
            {manages && (
              <>
                <p className="pose-photo__main-mark">
                  <Icon name="sun" />
                  {labels.mainPhotoMark}
                </p>
                <PhotoManagement page={page} photos={photos} photo={main} />
              </>
            )}
            {photos.length > 1 && (
              <a href={`#${otherPhotosAnchor}`} className="pose-photos__more" onClick={focusOtherPhotos}>
                {morePhotosLink(photos.length - 1)}
                <Icon name="chevronDown" />
              </a>
            )}
            {manages && photos.length === 1 && <ManagementFooter page={page} photos={photos} />}
          </div>
        </div>
      ) : (
        <>
          <p className="pose-photos__empty">{labels.noPhotoYet(page.name)}</p>
          <ManagementFooter page={page} photos={photos} />
        </>
      )}
    </section>
  );
}

/** The jump is immediate; the title of the section takes the focus (tabindex -1). */
const focusOtherPhotos = () => {
  requestAnimationFrame(() => document.getElementById(otherPhotosTitleId)?.focus());
};

/** The last section of the page: the other photos in a grid, their management, the footer of a validator. */
export function OtherPhotosSection({
  page,
  manages,
  onEnlarge,
}: {
  readonly page: PosePage;
  readonly manages: boolean;
  readonly onEnlarge: (index: number) => void;
}) {
  const photos = page.photos ?? [];
  if (photos.length < 2) return null;
  return (
    <section className="pose-other-photos" id={otherPhotosAnchor} aria-labelledby={otherPhotosTitleId}>
      <h2 id={otherPhotosTitleId} className="pose-page__section-title" tabIndex={-1}>
        {labels.otherPhotosTitle(page.name)}
      </h2>
      <ul className={`pose-photos__grid${manages ? ' pose-photos__grid--manage' : ''}`} role="list">
        {photos.slice(1).map((photo, index) => (
          <li key={photo.id} className="pose-photo-item">
            <PhotoFigure
              photo={photo}
              description={photoDescription(photo, index + 2, page.name)}
              onEnlarge={() => onEnlarge(index + 1)}
            />
            {manages && <PhotoManagement page={page} photos={photos} photo={photo} />}
          </li>
        ))}
      </ul>
      {manages && <ManagementFooter page={page} photos={photos} />}
    </section>
  );
}

/**
 * The enlargement (dialogue-agrandissement.md): a modal dialog « Photo 2 sur 3 de Bird », the photo entire with its
 * credit, « Photo précédente » and « Photo suivante » disabled at the ends, « Fermer » and Échap.
 */
export function PhotoViewer({
  page,
  index,
  onBrowse,
  onClose,
}: {
  readonly page: PosePage;
  readonly index: number;
  readonly onBrowse: (index: number) => void;
  readonly onClose: () => void;
}) {
  const photos = page.photos ?? [];
  const photo = photos[index];
  const dialog = useRef<HTMLDialogElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const announce = useAnnounce();
  // The photo opened: once closed (« Fermer », Échap, back), the focus comes back to its button.
  const [opened] = useState(photo?.id);
  const shown = useRef(index);

  useEffect(() => {
    const element = dialog.current;
    if (element && !element.open) {
      if (typeof element.showModal === 'function') element.showModal();
      else element.setAttribute('open', '');
    }
    close.current?.focus();
    return () => {
      if (opened) document.getElementById(enlargeButtonId(opened))?.focus();
    };
  }, [opened]);

  // The title changes without the focus moving: the photo now shown is said.
  useEffect(() => {
    if (shown.current === index || !photo) return;
    shown.current = index;
    announce(
      enlargedPhotoAnnouncement(
        index + 1,
        photos.length,
        page.name,
        photoDescription(photo, index + 1, page.name),
      ),
    );
  }, [index, photo, photos.length, page.name, announce]);

  if (!photo) return null;
  const first = index === 0;
  const last = index === photos.length - 1;
  return (
    <dialog
      ref={dialog}
      className="photo-viewer"
      aria-labelledby={titleId}
      aria-modal="true"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className="photo-viewer__header">
        <h2 id={titleId} className="photo-viewer__title">
          {enlargedPhotoTitle(index + 1, photos.length, page.name)}
        </h2>
        <button ref={close} type="button" className="button button--secondary" onClick={onClose}>
          <Icon name="close" />
          {labels.close}
        </button>
      </div>
      <div className="photo-viewer__stage">
        <img
          className="photo-img"
          src={photo.sources.enlarged}
          alt={photoDescription(photo, index + 1, page.name)}
          width={photo.width}
          height={photo.height}
        />
      </div>
      <div className="photo-viewer__footer">
        <p className="photo-viewer__credit">{photoCreditLabel(photo.credit)}</p>
        {photos.length > 1 && (
          <div className="photo-viewer__nav">
            <button
              type="button"
              className="button button--secondary"
              aria-disabled={first || undefined}
              onClick={() => (first ? undefined : onBrowse(index - 1))}
            >
              <Icon name="chevronLeft" />
              {labels.previous}
            </button>
            <button
              type="button"
              className="button button--secondary"
              aria-disabled={last || undefined}
              onClick={() => (last ? undefined : onBrowse(index + 1))}
            >
              {labels.next}
              <Icon name="chevronRight" />
            </button>
          </div>
        )}
      </div>
    </dialog>
  );
}
