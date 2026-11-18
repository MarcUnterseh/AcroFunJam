import {
  catalogLabels,
  myProposalsLabels,
  poseCountLabel,
  tagLabels,
  type PoseSummary,
} from '@acrofunjam/core';
import { useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { useAnnounce } from '../layout/Announcer';
import { focusPageTitle } from '../layout/focus';
import { Icon } from '../layout/Icon';
import { myProposalsPath, proposePosePath, tagsPath } from '../paths';
import { DifficultyLegend } from './DifficultyLegend';
import { PoseList } from './PoseList';
import { usePublishedPoses } from './usePublishedPoses';

/** Primary link-button (docs/design/composants/lien-bouton.md): it changes page, so it is a link. */
function ProposePoseLink() {
  return (
    <Link to={proposePosePath} className="button button--primary link-button">
      <Icon name="plus" />
      {catalogLabels.proposePose}
    </Link>
  );
}

/** Secondary link-button, without icon: « Proposer une pose » stays the only main action (lien-bouton.md). */
function MyProposalsLink() {
  return (
    <Link to={myProposalsPath} className="button button--secondary link-button">
      {myProposalsLabels.catalogLink}
    </Link>
  );
}

/** Secondary link-button « Étiquettes » (8-etiquettes.md, § 5): for everybody, last of the row. */
function TagsLink() {
  return (
    <Link to={tagsPath} className="button button--secondary link-button">
      {tagLabels.catalogLink}
    </Link>
  );
}

/**
 * Loading failure (docs/design/composants/alerte-formulaire.md, error variant, outside a form).
 * Only the message is the alert: the busy label of the button must not make it read again.
 */
function LoadingFailure({ retrying, onRetry }: { readonly retrying: boolean; readonly onRetry: () => void }) {
  return (
    <div className="form-alert">
      <Icon name="error" />
      <div className="form-alert__content">
        <p role="alert">{catalogLabels.loadingFailed}</p>
        <button
          type="button"
          className="button button--secondary"
          aria-disabled={retrying || undefined}
          onClick={() => (retrying ? undefined : onRetry())}
        >
          {retrying ? catalogLabels.retrying : catalogLabels.retry}
        </button>
      </div>
    </div>
  );
}

/** Empty catalog: a person who can propose is invited to propose the first pose (the only link of the page). */
function EmptyCatalog({ canPropose }: { readonly canPropose: boolean }) {
  return (
    <div className="catalog-empty">
      <p>{catalogLabels.empty}</p>
      {canPropose && (
        <>
          <p>{catalogLabels.emptyInvitation}</p>
          <ProposePoseLink />
        </>
      )}
    </div>
  );
}

function Poses({
  poses,
  revisable,
}: {
  readonly poses: readonly PoseSummary[];
  readonly revisable: boolean;
}) {
  return (
    <>
      <p className="catalog__count">{poseCountLabel(poses.length)}</p>
      <DifficultyLegend />
      <PoseList poses={poses} revisable={revisable} />
    </>
  );
}

type CatalogPageProps = {
  /** The person may propose a pose (capability "propose"); false for a visitor or while the session is checked. */
  readonly canPropose?: boolean;
};

/**
 * Catalog (docs/design/ecrans/3-proposer-une-pose.md): title, then count, legend and cards, or a state.
 * The links "Proposer une pose" and "Mes propositions" only appear once the poses are received (or could not
 * be), so that they never move; « Proposer une pose » is in the empty block when the catalog is empty.
 */
export function CatalogPage({ canPropose = false }: CatalogPageProps) {
  const { data: poses, error, refetch } = usePublishedPoses();
  const announce = useAnnounce();
  const [retrying, setRetrying] = useState(false);

  const retry = async () => {
    setRetrying(true);
    const result = await refetch();
    setRetrying(false);
    // The alert is already on screen: a new failure is announced, a success gives the focus back to the title.
    if (result.isError) announce(catalogLabels.loadingFailed);
    else focusPageTitle();
  };

  let content: ReactNode;
  // Poses already received stay on screen when a refresh fails: the failure only matters without them.
  if (poses === undefined && (error || retrying))
    content = <LoadingFailure retrying={retrying} onRetry={() => void retry()} />;
  else if (poses === undefined)
    content = (
      <p role="status" className="catalog__status">
        {catalogLabels.loading}
      </p>
    );
  else if (poses.length === 0) content = <EmptyCatalog canPropose={canPropose} />;
  else content = <Poses poses={poses} revisable={canPropose} />;

  return (
    <>
      <div className="page-header">
        <h1 tabIndex={-1}>{catalogLabels.title}</h1>
        {/* Once the poses are received or could not be: nothing moves while loading (story 5, Q23). */}
        {(poses !== undefined || error || retrying) && (
          <div className="page-header__actions">
            {canPropose && poses !== undefined && poses.length > 0 && <ProposePoseLink />}
            {canPropose && <MyProposalsLink />}
            <TagsLink />
          </div>
        )}
      </div>
      {content}
    </>
  );
}
