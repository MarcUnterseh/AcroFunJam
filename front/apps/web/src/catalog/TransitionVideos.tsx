import {
  canAddVideo,
  correctTransitionVideo,
  isBeingPrepared,
  readTransitionVideos,
  removeTransitionVideo,
  sameVideoStates,
  shouldPollVideos,
  transitionVideoLabels as labels,
  videoCaptionMaxLength,
  videoCountLabel,
  videoCreditLabel,
  videoCreditMaxLength,
  videoDescriptionMaxLength,
  videoDurationBadge,
  videoManagementErrorMessage,
  videoPlayName,
  videoPollingIntervalMs,
  videoRemovalConsequence,
  videoRemovalText,
  type LinkedTransition,
  type TransitionDirection,
  type TransitionVideo,
  type TransitionVideosError,
} from '@acrofunjam/core';
import { useQueryClient } from '@tanstack/react-query';
import {
  createContext,
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
import { addVideoPath } from '../paths';
import { TextField, usePendingFocus } from './PosePhotos';
import { useTransitionVideosPorts } from './TransitionVideosContext';
import { publishedPosesKey } from './usePublishedPoses';

/** The refusal of a credit that does not name the owner (« inconnu »…): an error of the field « Crédit ». */
export const creditNotAnAuthor = 'video.credit-not-an-author';

// Story 12 « Vidéos des transitions » (docs/design/ecrans/12-videos-des-transitions.md, rangee-videos.md,
// lecteur-video.md): the block « Vidéos » of a transition, its row of compact posters, the player of the site.

/** The video playing on the page: one at a time (UX-54). A washing machine shows its videos in two sections. */
const PlaybackContext = createContext<{
  readonly active: string | null;
  readonly setActive: (key: string | null) => void;
}>({ active: null, setActive: () => {} });

export function VideoPlayback({ children }: { readonly children: ReactNode }) {
  const [active, setActive] = useState<string | null>(null);
  return <PlaybackContext.Provider value={{ active, setActive }}>{children}</PlaybackContext.Provider>;
}

/** With the preference « réduire les animations », a launched video plays once (UX-51). */
const prefersReducedMotion = () =>
  typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * The player of the browser, launched by the person: in a loop (once with reduced motion), muted, in the page. It takes
 * the focus when the person launched it, and again after « Réessayer » (the button it replaces disappears).
 */
function LaunchedVideo({
  video,
  sources,
  captionId,
  descriptionId,
  takesFocus,
}: {
  readonly video: TransitionVideo;
  readonly sources: NonNullable<TransitionVideo['sources']>;
  readonly captionId: string;
  readonly descriptionId: string | undefined;
  readonly takesFocus: boolean;
}) {
  const player = useRef<HTMLVideoElement>(null);
  const [loop] = useState(() => !prefersReducedMotion());
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const element = player.current;
    if (!element) return;
    if (takesFocus || attempt > 0) element.focus();
    // React does not reflect « muted » as an attribute: set on the element, before playing (autoplay policies).
    element.muted = true;
    try {
      const playing = element.play() as Promise<void> | undefined;
      playing?.catch(() => {});
    } catch {
      // A browser (or jsdom) that cannot play: the controls stay.
    }
  }, [attempt]); // Once per display of the player: never again once the person moved the focus elsewhere.

  return (
    <div className={`video__stage${failed ? ' video__stage--failed' : ''}`}>
      {failed ? (
        <div className="video__error" role="status">
          <Icon name="error" />
          <p>{labels.playbackFailed}</p>
          <button
            type="button"
            className="button button--secondary"
            onClick={() => {
              setFailed(false);
              setAttempt((n) => n + 1);
            }}
          >
            {labels.retry}
          </button>
        </div>
      ) : (
        <video
          key={attempt}
          ref={player}
          src={sources.video}
          poster={sources.poster}
          width={video.width}
          height={video.height}
          // Focusable in every browser (Safari does not focus a player by itself): it takes the focus once launched.
          tabIndex={0}
          controls
          muted
          playsInline
          loop={loop}
          preload="auto"
          aria-labelledby={captionId}
          aria-describedby={descriptionId}
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}

type Zone = 'actions' | 'correcting' | 'removing';

type FieldMessages = { caption?: string; credit?: string; description?: string };

/**
 * The management of a video (validators and administrators): « Modifier » the caption, the credit and the description
 * in place, « Retirer » after a confirmation saying what it changes (rangee-videos.md).
 */
function VideoManagement({
  transition,
  spokenTitle,
  video,
  zone,
  onZone,
  videosTitleId,
}: {
  readonly transition: LinkedTransition;
  readonly spokenTitle: string;
  readonly video: TransitionVideo;
  readonly zone: Zone;
  readonly onZone: (zone: Zone) => void;
  /** The title « Vidéos » of the block: it takes the focus once the video is removed, if others remain. */
  readonly videosTitleId: string;
}) {
  const { gateway } = useTransitionVideosPorts();
  const queryClient = useQueryClient();
  const announce = useAnnounce();
  const focus = usePendingFocus();
  const { sessionExpired } = useSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<TransitionVideosError | null>(null);
  const [caption, setCaption] = useState(video.caption);
  const [credit, setCredit] = useState(video.credit);
  const [description, setDescription] = useState(video.description ?? '');
  const [fieldErrors, setFieldErrors] = useState<FieldMessages>({});
  const questionId = useId();
  const correctTitleId = useId();
  const captionId = useId();
  const creditId = useId();
  const descriptionId = useId();
  const question = useRef<HTMLParagraphElement>(null);
  const correctButton = useRef<HTMLButtonElement>(null);
  const removeButton = useRef<HTMLButtonElement>(null);
  const left = useRef<Zone>('actions');

  // Opening a zone gives the focus to its question or its first field; closing it gives it back to its button.
  useEffect(() => {
    if (zone === 'removing') question.current?.focus();
    else if (zone === 'correcting') document.getElementById(captionId)?.focus();
    else if (left.current === 'correcting') correctButton.current?.focus();
    else if (left.current === 'removing') removeButton.current?.focus();
    left.current = zone;
  }, [zone, captionId]);

  const failed = (failure: TransitionVideosError) => {
    if (failure.kind === 'session-expired') sessionExpired();
    setError(failure);
  };

  const remove = async () => {
    setBusy(true);
    const result = await removeTransitionVideo(gateway, transition.id, video.id);
    setBusy(false);
    if (!result.ok) return failed(result.error);
    announce(labels.removed(spokenTitle));
    // The video and its buttons go away: the focus goes to the title « Vidéos », or of the transition without videos.
    const transitionTitle =
      question.current?.closest('.transition')?.querySelector<HTMLElement>('.transition__title') ?? null;
    focus.expect(() => document.getElementById(videosTitleId) ?? transitionTitle);
    await queryClient.invalidateQueries({ queryKey: publishedPosesKey });
    focus.settle();
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setError(null);
    const result = await (async () => {
      setBusy(true);
      try {
        return await correctTransitionVideo(gateway, transition.id, video.id, {
          caption,
          credit,
          description,
        });
      } finally {
        setBusy(false);
      }
    })();
    if (!result.ok && result.error.kind === 'invalid-input') {
      const { errors } = result.error;
      const messages: FieldMessages = {
        ...(errors.caption
          ? { caption: errors.caption === 'required' ? labels.captionRequired : labels.captionTooLong }
          : {}),
        ...(errors.credit
          ? { credit: errors.credit === 'required' ? labels.creditRequired : labels.creditTooLong }
          : {}),
        ...(errors.description ? { description: labels.descriptionTooLong } : {}),
      };
      setFieldErrors(messages);
      const first = messages.caption ? captionId : messages.credit ? creditId : descriptionId;
      document.getElementById(first)?.focus();
      return;
    }
    if (!result.ok && result.error.kind === 'invalid' && result.error.code === creditNotAnAuthor) {
      setFieldErrors({ credit: labels.creditNotAnAuthorWhenCorrecting });
      document.getElementById(creditId)?.focus();
      return;
    }
    if (!result.ok) return failed(result.error);
    onZone('actions');
    announce(labels.corrected);
    await queryClient.invalidateQueries({ queryKey: publishedPosesKey });
  };

  const alert = error && (
    <FormAlert>
      <Icon name="error" />
      <div className="form-alert__content">
        <p>{videoManagementErrorMessage(error, spokenTitle)}</p>
      </div>
    </FormAlert>
  );

  if (zone === 'removing')
    return (
      <div className="video__zone" role="group" aria-labelledby={questionId}>
        <p ref={question} id={questionId} className="video__zone-title" tabIndex={-1}>
          {labels.removeQuestion(spokenTitle)}
        </p>
        <p className="video__zone-text">
          {videoRemovalText(videoRemovalConsequence(transition.videos), spokenTitle)}
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
          <button type="button" className="button button--secondary" onClick={() => onZone('actions')}>
            {labels.cancel}
          </button>
        </div>
      </div>
    );

  if (zone === 'correcting')
    return (
      <form
        className="video__zone"
        role="group"
        aria-labelledby={correctTitleId}
        onSubmit={(event) => void save(event)}
        noValidate
      >
        <p id={correctTitleId} className="video__zone-title">
          {labels.correctTitle}
        </p>
        {alert}
        <TextField
          id={captionId}
          label={labels.caption}
          help={`${labels.captionHelp} ${labels.captionExample}`}
          value={caption}
          onChange={setCaption}
          error={fieldErrors.caption}
          max={videoCaptionMaxLength}
        />
        <TextField
          id={creditId}
          label={labels.credit}
          help={labels.creditHelp}
          value={credit}
          onChange={setCredit}
          error={fieldErrors.credit}
          max={videoCreditMaxLength}
        />
        <TextField
          id={descriptionId}
          label={
            <>
              {labels.description} <span className="field__optional">{labels.optional}</span>
            </>
          }
          help={`${labels.descriptionHelp} ${labels.descriptionExample}`}
          value={description}
          onChange={setDescription}
          error={fieldErrors.description}
          multiline
          max={videoDescriptionMaxLength}
        />
        <div className="zone-actions">
          <button type="submit" className="button button--primary" aria-disabled={busy || undefined}>
            {busy ? labels.saving : labels.save}
          </button>
          <button type="button" className="button button--secondary" onClick={() => onZone('actions')}>
            {labels.cancel}
          </button>
        </div>
      </form>
    );

  return (
    <>
      {alert}
      <div className="video__actions">
        <button
          ref={correctButton}
          type="button"
          className="button button--secondary"
          onClick={() => {
            setCaption(video.caption);
            setCredit(video.credit);
            setDescription(video.description ?? '');
            setFieldErrors({});
            setError(null);
            onZone('correcting');
          }}
        >
          <span aria-hidden="true">{labels.correct}</span>
          <span className="visually-hidden">{labels.correctName(video.caption)}</span>
        </button>
        <button
          ref={removeButton}
          type="button"
          className="button button--secondary"
          onClick={() => {
            setError(null);
            onZone('removing');
          }}
        >
          <span aria-hidden="true">{labels.remove}</span>
          <span className="visually-hidden">{labels.removeName(video.caption)}</span>
        </button>
      </div>
    </>
  );
}

/** The frame of a video that is not ready yet (bloc-preparation-video.md), for the validators only. */
function PreparationFrame({ failed }: { readonly failed: boolean }) {
  return (
    <div className={`video__frame video__frame--${failed ? 'failed' : 'pending'}`}>
      <Icon name={failed ? 'error' : 'clock'} />
      <span>{failed ? labels.failed : labels.inPreparation}</span>
    </div>
  );
}

/**
 * A video: its compact poster with « Lire » and its duration, or, launched, the player at its place; for a validator, its
 * preparation and its management.
 */
function VideoCell({
  video,
  playbackKey,
  manage,
}: {
  readonly video: TransitionVideo;
  /** Unique on the page: the section, then the video. */
  readonly playbackKey: string;
  readonly manage?:
    | {
        readonly transition: LinkedTransition;
        readonly spokenTitle: string;
        readonly videosTitleId: string;
      }
    | undefined;
}) {
  const { active, setActive } = useContext(PlaybackContext);
  const captionId = useId();
  const descriptionId = useId();
  const playButton = useRef<HTMLButtonElement>(null);
  const closed = useRef(false);
  /** Launched by a click on « Lire » of this video (UX-54: launching another one brings back its poster). */
  const launchedByPerson = useRef(false);
  const [zone, setZone] = useState<Zone>('actions');
  const launched = active === playbackKey && video.sources !== null;
  const describedBy = video.description ? descriptionId : undefined;

  useEffect(() => {
    if (!launched && closed.current) {
      closed.current = false;
      playButton.current?.focus();
    }
  }, [launched]);

  const state = launched ? ' video--active' : zone !== 'actions' ? ' video--editing' : '';
  return (
    <li className={`video${state}`}>
      <figure className="video__figure">
        {video.preparation !== 'ready' || !video.sources ? (
          <PreparationFrame failed={video.preparation === 'failed'} />
        ) : launched ? (
          <LaunchedVideo
            video={video}
            sources={video.sources}
            captionId={captionId}
            descriptionId={describedBy}
            takesFocus={launchedByPerson.current}
          />
        ) : (
          <button
            ref={playButton}
            type="button"
            className="video__play"
            aria-describedby={describedBy}
            onClick={() => {
              launchedByPerson.current = true;
              setActive(playbackKey);
            }}
          >
            <img
              className="video__poster"
              src={video.sources.poster}
              alt=""
              width={video.width}
              height={video.height}
            />
            <span className="video__play-pill">
              <Icon name="play" />
              <span aria-hidden="true">{labels.play}</span>
              <span className="visually-hidden">{videoPlayName(video.caption, video.durationMs)}</span>
            </span>
            <span className="video__duration" aria-hidden="true">
              {videoDurationBadge(video.durationMs)}
            </span>
          </button>
        )}
        <div className="video__caption-row">
          <figcaption className="video__caption">
            <p id={captionId} className="video__legend">
              {video.caption}
            </p>
            <p className="video__credit">{videoCreditLabel(video.credit)}</p>
          </figcaption>
          {launched && (
            <button
              type="button"
              className="button button--secondary video__close"
              onClick={() => {
                closed.current = true;
                setActive(null);
              }}
            >
              <Icon name="close" />
              <span aria-hidden="true">{labels.close}</span>
              <span className="visually-hidden">{labels.closeName(video.caption)}</span>
            </button>
          )}
        </div>
      </figure>
      {video.description && (
        <details className="video__description tag-meanings">
          <summary className="tag-meanings__summary">
            {labels.descriptionSummary}{' '}
            <span className="visually-hidden">{labels.descriptionSummaryOf(video.caption)}</span>
            <Icon name="chevronDown" />
          </summary>
          <p id={descriptionId}>{video.description}</p>
        </details>
      )}
      {manage && (
        <VideoManagement
          transition={manage.transition}
          spokenTitle={manage.spokenTitle}
          video={video}
          zone={zone}
          onZone={setZone}
          videosTitleId={manage.videosTitleId}
        />
      )}
    </li>
  );
}

/**
 * Validators: while a video of the transition is being prepared, its videos are read again every 5 seconds, for 15
 * minutes at most, not while the tab is hidden (ADR 0041, UX-52); once a preparation ends, the page is read again.
 */
function useVideoPreparation(transition: LinkedTransition, manages: boolean, spokenTitle: string) {
  const { gateway } = useTransitionVideosPorts();
  const queryClient = useQueryClient();
  const announce = useAnnounce();
  const [startedAt] = useState(() => Date.now());
  const [tookTooLong, setTookTooLong] = useState(false);
  const preparing = manages && isBeingPrepared(transition.videos);
  const current = useRef(transition.videos);
  current.current = transition.videos;

  useEffect(() => {
    if (!preparing) return;
    let reading = false;
    const timer = setInterval(() => {
      if (reading || document.visibilityState === 'hidden') return;
      if (!shouldPollVideos(current.current, Date.now() - startedAt)) {
        clearInterval(timer);
        // The page stops following the preparation: the person is told to come back later (O5).
        setTookTooLong(true);
        return;
      }
      reading = true;
      void readTransitionVideos(gateway, transition.id).then(async (result) => {
        reading = false;
        if (!result.ok || sameVideoStates(result.value, current.current)) return;
        for (const video of result.value) {
          const before = current.current.find((known) => known.id === video.id);
          if (before?.preparation !== 'in-preparation') continue;
          if (video.preparation === 'ready') announce(labels.prepared(video.caption));
          if (video.preparation === 'failed') announce(labels.preparationFailed(video.caption));
        }
        await queryClient.invalidateQueries({ queryKey: publishedPosesKey });
      });
    }, videoPollingIntervalMs);
    return () => clearInterval(timer);
  }, [preparing, gateway, transition.id, startedAt, queryClient, announce, spokenTitle]);
  return preparing && tookTooLong;
}

/**
 * The block « Vidéos » of a transition (rangee-videos.md): its title, the reminder of safety, the row of its videos, and
 * for a validator what could not be prepared; absent when the transition presents none.
 */
export function TransitionVideos({
  transition,
  spokenTitle,
  section,
  manages,
}: {
  readonly transition: LinkedTransition;
  /** « Pop to Bird », « de Bird vers Star »: completes the title for the assistive technologies. */
  readonly spokenTitle: string;
  /** The section of the page (« depuis », « vers »): a washing machine shows its videos in both. */
  readonly section: string;
  /** A validator or an administrator: every video, in every preparation, and their management. */
  readonly manages: boolean;
}) {
  const titleId = useId();
  const tookTooLong = useVideoPreparation(transition, manages, spokenTitle);
  const videos = manages
    ? transition.videos
    : transition.videos.filter((video) => video.preparation === 'ready');
  if (videos.length === 0) return null;
  return (
    <div className="transition-videos" role="group" aria-labelledby={titleId}>
      {/* tabindex -1: it takes the focus once a video is removed and others remain. */}
      <h4 id={titleId} className="transition-videos__title" tabIndex={-1}>
        {labels.title} <span className="visually-hidden">{labels.titleOf(spokenTitle)}</span>
      </h4>
      <p className="transition-videos__reminder">
        <Icon name="spot" />
        <span>{labels.reminder}</span>
      </p>
      <ul className="transition-videos__list" role="list">
        {videos.map((video) => (
          <VideoCell
            key={video.id}
            video={video}
            playbackKey={`${section}-${video.id}`}
            manage={manages ? { transition, spokenTitle, videosTitleId: titleId } : undefined}
          />
        ))}
      </ul>
      {videos
        .filter((video) => video.preparation === 'failed')
        .map((video) => (
          <div key={video.id} className="form-alert transition-videos__alert">
            <Icon name="error" />
            <p>{labels.preparationFailed(video.caption)}</p>
          </div>
        ))}
      {tookTooLong && (
        <p className="transition-videos__late">
          <Icon name="clock" />
          <span>{labels.preparationTakesLong}</span>
        </p>
      )}
    </div>
  );
}

/**
 * The invitation of the footer of management of a transition (validators and administrators): « Ajouter une vidéo » and
 * « 1 vidéo sur 3 », or the sentence of the maximum.
 */
export function VideoInvitation({
  poseId,
  transition,
  spokenTitle,
  direction,
}: {
  readonly poseId: string;
  readonly transition: LinkedTransition;
  readonly spokenTitle: string;
  readonly direction: TransitionDirection;
}) {
  const count = transition.videos.length;
  if (!canAddVideo(count))
    return <p className="transition__videos-max">{labels.maximumReached(spokenTitle)}</p>;
  return (
    <div className="transition__videos-manage">
      <Link
        to={addVideoPath(poseId, transition.id, direction)}
        className="button button--secondary link-button"
        aria-label={labels.addVideoName(spokenTitle)}
      >
        <Icon name="plus" />
        {labels.addVideo}
      </Link>
      {count > 0 && <p className="transition__videos-count">{videoCountLabel(count)}</p>}
    </div>
  );
}
