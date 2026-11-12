import {
  getMyProposals,
  myProposalCountLabel,
  myProposalsLabels,
  type MyProposal,
  type MyProposalsError,
} from '@acrofunjam/core';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { useSession } from '../identity/SessionContext';
import { useAnnounce } from '../layout/Announcer';
import { focusPageTitle } from '../layout/focus';
import { Icon } from '../layout/Icon';
import { proposePosePath } from '../paths';
import { useContribution } from './ContributionContext';
import { MyProposalCard } from './MyProposalCard';

type Proposals =
  | { readonly status: 'loading' }
  | { readonly status: 'failed'; readonly error: MyProposalsError }
  | { readonly status: 'loaded'; readonly proposals: readonly MyProposal[] };

/**
 * Loading failure (alerte-formulaire.md, error variant, outside a form), as in the catalog: only the message
 * is the alert, the busy label of the button must not make it read again.
 */
function LoadingFailure({ retrying, onRetry }: { readonly retrying: boolean; readonly onRetry: () => void }) {
  return (
    <div className="form-alert">
      <Icon name="error" />
      <div className="form-alert__content">
        <p role="alert">{myProposalsLabels.loadingFailed}</p>
        <button
          type="button"
          className="button button--secondary"
          aria-disabled={retrying || undefined}
          onClick={() => (retrying ? undefined : onRetry())}
        >
          {retrying ? myProposalsLabels.retrying : myProposalsLabels.retry}
        </button>
      </div>
    </div>
  );
}

/** The site is outdated (an answer it cannot read): retrying would fail again, only reloading helps. */
function OutdatedSite() {
  return (
    <div className="form-alert">
      <Icon name="error" />
      <div className="form-alert__content">
        <p role="alert">{myProposalsLabels.loadingOutdated}</p>
        <button type="button" className="button button--secondary" onClick={() => location.reload()}>
          {myProposalsLabels.reload}
        </button>
      </div>
    </div>
  );
}

/** Nothing proposed yet: same block as the empty queue, the primary link as on the catalog (the only one). */
function NoProposal() {
  return (
    <div className="catalog-empty validation-empty">
      <p className="validation-empty__title">{myProposalsLabels.emptyTitle}</p>
      <p className="validation-empty__text">{myProposalsLabels.emptyText}</p>
      <Link to={proposePosePath} className="button button--primary link-button">
        <Icon name="plus" />
        {myProposalsLabels.proposePose}
      </Link>
    </div>
  );
}

/**
 * The proposals of the requester, loaded once per display of the page (docs/design/ecrans/5-mes-propositions.md):
 * loading, failure with « Réessayer », nothing proposed yet, or the cards, the most recently submitted first.
 */
export function MyProposalList() {
  const { gateway } = useContribution();
  const { sessionExpired } = useSession();
  const announce = useAnnounce();
  const [proposals, setProposals] = useState<Proposals>({ status: 'loading' });
  const [retrying, setRetrying] = useState(false);
  const mounted = useRef(true);

  const load = useCallback(async () => {
    const answer = await getMyProposals(gateway);
    if (!mounted.current) return null;
    setProposals(
      answer.ok ? { status: 'loaded', proposals: answer.value } : { status: 'failed', error: answer.error },
    );
    return answer;
  }, [gateway]);

  useEffect(() => {
    mounted.current = true;
    void load();
    return () => {
      mounted.current = false;
    };
  }, [load]);

  // Expired as the list loads: the session ends on the site too, and the page tells it (MyProposalsPage).
  const expired = proposals.status === 'failed' && proposals.error.kind === 'session-expired';
  useEffect(() => {
    if (expired) sessionExpired();
  }, [expired, sessionExpired]);

  const retry = async () => {
    setRetrying(true);
    const answer = await load();
    if (!answer) return; // the list is gone meanwhile
    setRetrying(false);
    // The alert is already on screen: the same failure again is announced. Otherwise the button is gone (the
    // proposals, the outdated site, the expired session, each telling itself): the focus goes to the title.
    if (!answer.ok && answer.error.kind === 'unreachable') announce(myProposalsLabels.loadingFailed);
    else focusPageTitle();
  };

  switch (proposals.status) {
    case 'loading':
      return (
        <p role="status" className="follow-up-page__status">
          {myProposalsLabels.loading}
        </p>
      );
    case 'failed':
      if (expired) return null;
      if (proposals.error.kind === 'outdated') return <OutdatedSite />;
      return <LoadingFailure retrying={retrying} onRetry={() => void retry()} />;
  }
  if (proposals.proposals.length === 0) return <NoProposal />;
  return (
    <>
      <p className="follow-up-page__introduction">{myProposalsLabels.introduction}</p>
      <p className="follow-up-page__count">{myProposalCountLabel(proposals.proposals.length)}</p>
      {/* role="list" restores the list semantics that some browsers drop with "list-style: none". */}
      <ul className="validation-queue" role="list">
        {proposals.proposals.map((proposal) => (
          <li key={proposal.id}>
            <MyProposalCard proposal={proposal} />
          </li>
        ))}
      </ul>
    </>
  );
}
