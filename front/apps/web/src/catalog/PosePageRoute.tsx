import {
  canPropose,
  emptyTransitionsLabel,
  getPosePage,
  isSamePose,
  otherPoseLead,
  posePageLabels,
  proposeTransitionFromLabel,
  transitionsSectionTitle,
  unnamedTransitionLabel,
  type LinkedTransition,
  type PosePage,
  type PosePageError,
  type TransitionDirection,
} from '@acrofunjam/core';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useId, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router';
import { useSession } from '../identity/SessionContext';
import { useAnnounce } from '../layout/Announcer';
import { focusPageTitle } from '../layout/focus';
import { Icon } from '../layout/Icon';
import { catalogPath, posePath, revisionPath, transitionProposalPath } from '../paths';
import { DifficultyLegend } from './DifficultyLegend';
import { DifficultyDetails, PoseDetails } from './PoseList';
import { usePosePageGateway } from './PosePageContext';

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
function usePosePage(poseId: string) {
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

/** « Throne → Bird », read « de Throne vers Bird »: the arrow and the names hidden from assistive technologies. */
function UnnamedTitle({ from, to }: { readonly from: string; readonly to: string }) {
  const { shown, spoken } = unnamedTransitionLabel({ from, to });
  return (
    <>
      <span className="visually-hidden">{spoken}</span>
      <span className="transition__poses" aria-hidden="true">
        <span>{shown[0]}</span>
        <Icon name="arrow" />
        <span>{shown[1]}</span>
      </span>
    </>
  );
}

/**
 * A transition of a section (docs/design/composants/element-transition.md): its name, or its poses without one; the
 * other pose, a link to its page, « (même pose) » for a washing machine; its difficulties; its description, plain
 * text with its line breaks.
 */
function TransitionItem({
  page,
  direction,
  transition,
}: {
  readonly page: PosePage;
  readonly direction: TransitionDirection;
  readonly transition: LinkedTransition;
}) {
  const other = transition.otherPose;
  const [from, to] = direction === 'from' ? [page.name, other.name] : [other.name, page.name];
  return (
    <li className="transition">
      <h3 className="transition__title">{transition.name ?? <UnnamedTitle from={from} to={to} />}</h3>
      <p className="transition__other-pose">
        <span>{otherPoseLead(direction)}</span>
        <Link to={posePath(other.id)} className="transition__other-pose-link">
          {other.name}
        </Link>
        {isSamePose(page, transition) && <span>{posePageLabels.samePose}</span>}
      </p>
      <DifficultyDetails difficulties={transition} />
      {transition.description && <p className="transition__description">{transition.description}</p>}
    </li>
  );
}

/** « Transitions depuis Throne » / « Transitions vers Throne »: a flat list, or a sentence when it is empty. */
function TransitionSection({
  page,
  direction,
}: {
  readonly page: PosePage;
  readonly direction: TransitionDirection;
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
            <TransitionItem key={transition.id} page={page} direction={direction} transition={transition} />
          ))}
        </ul>
      )}
    </section>
  );
}

/** The pose, its characteristics, the scale and the warning, then its two sections of transitions. */
function LoadedPage({ page, canProposeHere }: { readonly page: PosePage; readonly canProposeHere: boolean }) {
  return (
    <>
      <h1 tabIndex={-1} className="pose-page__title">
        {page.name}
      </h1>
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
      <div className="pose-page__panel">
        <PoseDetails pose={page} />
      </div>
      <DifficultyLegend warning={posePageLabels.responsibilityWarning} />
      <TransitionSection page={page} direction="from" />
      <TransitionSection page={page} direction="to" />
    </>
  );
}

/** « Pose introuvable »: the title says it, then a way back to the catalog. */
function PoseNotFound() {
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
function LoadingFailure({
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
  if (page) content = <LoadedPage page={page} canProposeHere={canPropose(session)} />;
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

  return (
    <div className="pose-page">
      <BackLink />
      {content}
    </div>
  );
}
