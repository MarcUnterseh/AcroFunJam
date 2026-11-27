import {
  canManagePhotos,
  canManageTags,
  canManageVideos,
  canPropose,
  enlargedPhotoIndex,
  emptyTransitionsLabel,
  getPosePage,
  isSamePose,
  otherPoseLead,
  posePageLabels,
  poseTaggingLabels,
  poseTagChoices,
  proposeTransitionFromLabel,
  transitionsSectionTitle,
  transitionTagLabels,
  unnamedTransitionLabel,
  videoTransitionName,
  type LinkedTransition,
  type PosePage,
  type PosePageError,
  type TransitionDirection,
} from '@acrofunjam/core';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router';
import { useSession } from '../identity/SessionContext';
import { useAnnounce } from '../layout/Announcer';
import { focusPageTitle } from '../layout/focus';
import { Icon } from '../layout/Icon';
import { TagLine, TagMeanings } from '../layout/tag-parts';
import { catalogPath, posePath, revisionPath, transitionAnchor, transitionProposalPath } from '../paths';
import { DifficultyLegend } from './DifficultyLegend';
import { DifficultyDetails, PoseDetails } from './PoseList';
import { usePosePageGateway } from './PosePageContext';
import { MainPhotoSection, OtherPhotosSection, PhotoFocus, PhotoViewer } from './PosePhotos';
import { PoseTagging } from './PoseTagging';
import { useTags } from './useTags';
import { TransitionTagging } from './TransitionTagging';
import { TransitionVideos, VideoInvitation, VideoPlayback } from './TransitionVideos';

/** The page of a pose could not be read: carries the failure of the use case. */
class PosePageLoadingFailed extends Error {
  readonly failure: PosePageError;

  constructor(failure: PosePageError) {
    super(failure.kind);
    this.failure = failure;
    this.name = 'PosePageLoadingFailed';
  }
}

/**
 * Cache key of the page of a pose: under the published poses, so that a page that publishes (a pose, a transition,
 * a modification) and invalidates them invalidates the pages of the poses too.
 */
export const posePageKey = (poseId: string) => ['catalog', 'poses', poseId, 'page'] as const;

/** The page of a pose, through the getPosePage use case of @acrofunjam/core. */
export function usePosePage(poseId: string) {
  const gateway = usePosePageGateway();
  return useQuery<PosePage, PosePageLoadingFailed>({
    queryKey: posePageKey(poseId),
    queryFn: async () => {
      const result = await getPosePage(gateway, poseId);
      if (!result.ok) throw new PosePageLoadingFailed(result.error);
      return result.value;
    },
    // As the catalog: the failure is shown at once with « Réessayer », even when the browser believes it is offline.
    retry: false,
    networkMode: 'always',
  });
}

/** « ‹ Catalogue » (docs/design/composants/lien-retour.md): always at the top of the page, whatever its state. */
function BackLink() {
  return (
    <Link to={catalogPath} className="back-link">
      <Icon name="chevronLeft" />
      {posePageLabels.back}
    </Link>
  );
}

/**
 * « Throne ⤳ Bird », read « de Throne vers Bird »: the dotted trajectory (a loop for a washing machine) and the names
 * hidden from assistive technologies.
 */
function UnnamedTitle({ from, to }: { readonly from: string; readonly to: string }) {
  const { shown, spoken } = unnamedTransitionLabel({ from, to });
  return (
    <>
      <span className="visually-hidden">{spoken}</span>
      <span className="transition__poses" aria-hidden="true">
        <span>{shown[0]}</span>
        <Icon name={from === to ? 'loop' : 'trajectory'} />
        <span>{shown[1]}</span>
      </span>
    </>
  );
}

/**
 * A transition of a section (docs/design/composants/element-transition.md): its name, or its poses without one; the
 * other pose, a link to its page, « (même pose) » for a washing machine; its difficulties; its tags (story 8); its
 * description, plain text with its line breaks; the fold of the meaning of its tags; the zone « Étiqueter » of a
 * validator.
 */
function TransitionItem({
  page,
  direction,
  transition,
  manages,
}: {
  readonly page: PosePage;
  readonly direction: TransitionDirection;
  readonly transition: LinkedTransition;
  /** A validator or an administrator: invited to tag the transition. */
  readonly manages: boolean;
}) {
  const other = transition.otherPose;
  const [from, to] = direction === 'from' ? [page.name, other.name] : [other.name, page.name];
  const samePose = isSamePose(page, transition);
  const spokenTitle = transition.name ?? unnamedTransitionLabel({ from, to }).spoken;
  // « Ajouter une vidéo à la transition de Throne vers Bird »: the labels of the videos take a preposition.
  const videoTitle = videoTransitionName({ name: transition.name, from, to });
  // Story 12: the videos are managed with their own capability (Q230).
  const { session } = useSession();
  const managesVideos = canManageVideos(session);
  return (
    <li className="transition" id={transitionAnchor(direction, transition.id)}>
      <h3 className="transition__title" tabIndex={-1}>
        {transition.name ?? <UnnamedTitle from={from} to={to} />}
      </h3>
      <p className="transition__other-pose">
        <span>{otherPoseLead(direction)}</span>
        {/* A named washing machine shows its loop here: its title does not draw it. */}
        {transition.name && samePose && <Icon name="loop" />}
        <Link to={posePath(other.id)} className="transition__other-pose-link">
          {other.name}
        </Link>
        {samePose && <span>{posePageLabels.samePose}</span>}
      </p>
      <DifficultyDetails difficulties={transition} />
      <TagLine tags={transition.tags} />
      {transition.description && <p className="transition__description">{transition.description}</p>}
      <TransitionVideos
        transition={transition}
        spokenTitle={videoTitle}
        section={direction}
        manages={managesVideos}
      />
      <TagMeanings tags={transition.tags} summary={transitionTagLabels.transitionMeanings} />
      {(manages || managesVideos) && (
        <div className="transition__manage">
          {manages && <TransitionTagging transition={transition} spokenTitle={spokenTitle} />}
          {managesVideos && (
            <VideoInvitation
              poseId={page.id}
              transition={transition}
              spokenTitle={videoTitle}
              direction={direction}
            />
          )}
        </div>
      )}
    </li>
  );
}

/** « Transitions depuis Throne » / « Transitions vers Throne »: a flat list, or a sentence when it is empty. */
function TransitionSection({
  page,
  direction,
  manages,
}: {
  readonly page: PosePage;
  readonly direction: TransitionDirection;
  readonly manages: boolean;
}) {
  const titleId = useId();
  const transitions = direction === 'from' ? page.transitionsFrom : page.transitionsTo;
  return (
    <section className="pose-page__section" aria-labelledby={titleId}>
      <h2 id={titleId} className="pose-page__section-title">
        {transitionsSectionTitle(direction, page.name)}
      </h2>
      {transitions.length === 0 ? (
        <p className="transition-list__empty">{emptyTransitionsLabel(direction, page.name)}</p>
      ) : (
        // role="list" restores the list semantics that some browsers drop with "list-style: none".
        <ul className="transition-list" role="list">
          {transitions.map((transition) => (
            <TransitionItem
              key={transition.id}
              page={page}
              direction={direction}
              transition={transition}
              manages={manages}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

/** The wavy horizon closing the sky, in the colour of the page: decorative. */
function Horizon() {
  return (
    <svg
      className="pose-hero__horizon"
      viewBox="0 0 900 26"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M0 26V16C200 2 380 0 520 6s260 14 380 2V26z" />
    </svg>
  );
}

/**
 * The pose, its characteristics, the scale and the warning, then its two sections of transitions. The header of the
 * page is the only spectacular moment of the site (principes.md): the name under a sky, a rising orb, a horizon.
 */
function LoadedPage({
  page,
  canProposeHere,
  manages,
  managesPhotos,
}: {
  readonly page: PosePage;
  readonly canProposeHere: boolean;
  readonly manages: boolean;
  readonly managesPhotos: boolean;
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  // Story 12 (UX-57): back from « Ajouter une vidéo », the page opens on the transition, whose title takes the focus.
  const { hash } = useLocation();
  useEffect(() => {
    const transition = hash ? document.getElementById(decodeURIComponent(hash.slice(1))) : null;
    if (!transition) return;
    if (typeof transition.scrollIntoView === 'function') transition.scrollIntoView({ block: 'start' });
    transition.querySelector<HTMLElement>('.transition__title')?.focus({ preventScroll: true });
  }, [hash]);
  const photos = page.photos ?? [];
  const enlarged = enlargedPhotoIndex(searchParams.get('photo'), photos.length);
  // Opened by a click: an entry of the history, so that « back » on a phone closes it (R18).
  const openedHere = useRef(false);
  const enlarge = (index: number) => {
    openedHere.current = true;
    setSearchParams({ photo: String(index + 1) });
  };
  const browse = (index: number) => setSearchParams({ photo: String(index + 1) }, { replace: true });
  const closeViewer = () => {
    if (openedHere.current) {
      openedHere.current = false;
      void navigate(-1);
    } else setSearchParams({}, { replace: true });
  };
  // Story 10: with a main photo, the safety note goes next to it, without being repeated under the legend.
  const safetyNote = (
    <p className="safety-note">
      <Icon name="spot" />
      <span>{posePageLabels.responsibilityWarning}</span>
    </p>
  );
  const notePlacedWithPhoto = photos.length > 0;
  return (
    <>
      <div className="pose-hero">
        <BackLink />
        <h1 tabIndex={-1} className="pose-page__title">
          {page.name}
        </h1>
        <PoseDetails pose={page} tags={page.tags} />
        <Horizon />
      </div>
      <PhotoFocus page={page}>
        <VideoPlayback>
          <div className="pose-page__body">
            <MainPhotoSection
              page={page}
              manages={managesPhotos}
              safetyNote={safetyNote}
              onEnlarge={enlarge}
            />
            <PoseTags page={page} manages={manages} />
            {/* Only for a person who may propose: absent otherwise, without any space kept for them. */}
            {canProposeHere && (
              <div className="pose-page__actions">
                <Link to={transitionProposalPath(page.id)} className="button button--primary link-button">
                  <Icon name="plus" />
                  {proposeTransitionFromLabel(page.name)}
                </Link>
                <Link to={revisionPath(page.id)} className="button button--secondary link-button">
                  {posePageLabels.proposeRevision}
                </Link>
              </div>
            )}
            <DifficultyLegend
              warning={notePlacedWithPhoto ? null : posePageLabels.responsibilityWarning}
              safetyNote
            />
            <TransitionSection page={page} direction="from" manages={manages} />
            <TransitionSection page={page} direction="to" manages={manages} />
            <OtherPhotosSection page={page} manages={managesPhotos} onEnlarge={enlarge} />
          </div>
        </VideoPlayback>
      </PhotoFocus>
      {enlarged !== null && (
        <PhotoViewer page={page} index={enlarged} onBrowse={browse} onClose={closeViewer} />
      )}
    </>
  );
}

/**
 * Story 9a: the block of the tags of the pose, at the top of the body (9a-etiquettes-des-poses.md § 1): their meaning in a
 * fold, and for a validator « Étiqueter la pose »; absent when there is nothing to show, without any space kept.
 */
function PoseTags({ page, manages }: { readonly page: PosePage; readonly manages: boolean }) {
  // A validator is invited only when at least one tag of the list applies to poses (nothing to choose otherwise).
  const { data: list } = useTags({ enabled: manages });
  const tags = manages && poseTagChoices(list ?? []).length > 0;
  if (page.tags.length === 0 && !tags) return null;
  return (
    <div className="pose-tags">
      <TagMeanings tags={page.tags} summary={poseTaggingLabels.meanings} />
      {tags && <PoseTagging page={page} />}
    </div>
  );
}

/** « Pose introuvable »: the title says it, then a way back to the catalog. */
export function PoseNotFound() {
  return (
    <div className="pose-page__not-found">
      <h1 tabIndex={-1}>{posePageLabels.notFoundTitle}</h1>
      <p>{posePageLabels.notFoundText}</p>
      <Link to={catalogPath} className="button button--secondary link-button">
        {posePageLabels.seeCatalog}
      </Link>
    </div>
  );
}

/** Loading failure (alerte-formulaire.md, error variant, outside a form), as on the catalog. */
export function LoadingFailure({
  outdated,
  retrying,
  onRetry,
}: {
  readonly outdated: boolean;
  readonly retrying: boolean;
  readonly onRetry: () => void;
}) {
  return (
    <div className="form-alert">
      <Icon name="error" />
      <div className="form-alert__content">
        <p role="alert">{outdated ? posePageLabels.loadingOutdated : posePageLabels.loadingFailed}</p>
        {outdated ? (
          <button type="button" className="button button--secondary" onClick={() => location.reload()}>
            {posePageLabels.reload}
          </button>
        ) : (
          <button
            type="button"
            className="button button--secondary"
            aria-disabled={retrying || undefined}
            onClick={() => (retrying ? undefined : onRetry())}
          >
            {retrying ? posePageLabels.retrying : posePageLabels.retry}
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Page of a pose (docs/design/ecrans/7-proposer-une-transition.md), for every visitor: loading, failure with
 * « Réessayer », « Pose introuvable », or the pose and its transitions. A person who may propose is invited to propose a
 * transition from the pose, or a modification of it.
 */
export function PosePageRoute() {
  const { id: poseId = '' } = useParams();
  const { session } = useSession();
  const { data: page, error, refetch } = usePosePage(poseId);
  const announce = useAnnounce();
  const [retrying, setRetrying] = useState(false);
  // After « Réessayer », the title appears with the page: it takes the focus once rendered.
  const [titleToFocus, setTitleToFocus] = useState(false);
  const notFound = page === undefined && error?.failure.kind === 'not-found';

  const name = page?.name;
  useEffect(() => {
    document.title = `${name ?? (notFound ? posePageLabels.notFoundTitle : 'Pose')} – AcroFunJam`;
  }, [name, notFound]);

  useEffect(() => {
    if (!titleToFocus || (!page && !notFound)) return;
    focusPageTitle();
    setTitleToFocus(false);
  }, [titleToFocus, page, notFound]);

  const retry = async () => {
    setRetrying(true);
    const result = await refetch();
    setRetrying(false);
    // The alert is already on screen: a new failure is announced, a success gives the focus to the title.
    if (result.isError) announce(posePageLabels.loadingFailed);
    else setTitleToFocus(true);
  };

  let content: ReactNode;
  // A page already received stays on screen when a refresh fails: the failure only matters without it.
  if (page)
    content = (
      <LoadedPage
        page={page}
        canProposeHere={canPropose(session)}
        manages={canManageTags(session)}
        managesPhotos={canManagePhotos(session)}
      />
    );
  else if (notFound) content = <PoseNotFound />;
  else if (error || retrying)
    content = (
      <LoadingFailure
        outdated={error?.failure.kind === 'outdated'}
        retrying={retrying}
        onRetry={() => void retry()}
      />
    );
  else
    content = (
      <p role="status" className="catalog__status">
        {posePageLabels.loading}
      </p>
    );

  // Once loaded, the link back sits in the sky of the pose (LoadedPage); always first in the page.
  return (
    <div className={`pose-page${page ? ' pose-page--loaded' : ''}`}>
      {!page && <BackLink />}
      {content}
    </div>
  );
}
