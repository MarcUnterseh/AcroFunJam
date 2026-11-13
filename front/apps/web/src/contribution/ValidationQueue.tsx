import {
  getValidationQueue,
  restoreDecisionInputs,
  pendingCountLabel,
  validationLabels,
  type AccessError,
  type KeptDecision,
  type PendingProposal,
  type RecordedDecision,
  type RecordedTransitionDecision,
} from '@acrofunjam/core';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, Navigate } from 'react-router';
import { useSession } from '../identity/SessionContext';
import { useAnnounce } from '../layout/Announcer';
import { focusPageTitle } from '../layout/focus';
import { Icon } from '../layout/Icon';
import { catalogPath, signInPath, validationPath } from '../paths';
import { DecisionReport } from './DecisionReport';
import { RoleWithdrawn } from './RoleWithdrawn';
import { ProposalCard } from './ProposalCard';
import { TransitionProposalCard } from './TransitionProposalCard';
import { usePendingCountUpdates } from './usePendingCount';
import { useValidation } from './ValidationContext';

type Queue =
  | { readonly status: 'loading' }
  | { readonly status: 'failed'; readonly error: AccessError }
  | { readonly status: 'loaded'; readonly proposals: readonly PendingProposal[] };

/**
 * Loading failure (alerte-formulaire.md, error variant, outside a form), as in the catalog: only the message
 * is the alert, the busy label of the button must not make it read again.
 */
function LoadingFailure({ retrying, onRetry }: { readonly retrying: boolean; readonly onRetry: () => void }) {
  return (
    <div className="form-alert">
      <Icon name="error" />
      <div className="form-alert__content">
        <p role="alert">{validationLabels.loadingFailed}</p>
        <button
          type="button"
          className="button button--secondary"
          aria-disabled={retrying || undefined}
          onClick={() => (retrying ? undefined : onRetry())}
        >
          {retrying ? validationLabels.retrying : validationLabels.retry}
        </button>
      </div>
    </div>
  );
}

/** The site is outdated (a refusal it does not know): retrying would fail again, only reloading helps. */
function OutdatedSite() {
  return (
    <div className="form-alert">
      <Icon name="error" />
      <div className="form-alert__content">
        <p role="alert">{validationLabels.loadingOutdated}</p>
        <button type="button" className="button button--secondary" onClick={() => location.reload()}>
          {validationLabels.reload}
        </button>
      </div>
    </div>
  );
}

/** Empty queue: same block as the empty catalog, with a secondary link (nothing else is expected). */
function EmptyQueue() {
  return (
    <div className="catalog-empty validation-empty">
      <p className="validation-empty__title">{validationLabels.emptyTitle}</p>
      <p className="validation-empty__text">{validationLabels.emptyText}</p>
      <Link to={catalogPath} className="button button--secondary link-button">
        {validationLabels.seeCatalog}
      </Link>
    </div>
  );
}

/**
 * The validation queue, loaded once per display of the page (docs/design/ecrans/4-valider-une-proposition.md):
 * loading, failure with « Réessayer », empty queue, or the cards, the oldest first.
 */
export function ValidationQueue({ owner }: { readonly owner: string }) {
  const { gateway, store } = useValidation();
  const { sessionExpired } = useSession();
  const announce = useAnnounce();
  const [queue, setQueue] = useState<Queue>({ status: 'loading' });
  const [retrying, setRetrying] = useState(false);
  // The reports of the decisions, by proposal: kept until the page is loaded again.
  const [decided, setDecided] = useState<
    Readonly<Record<string, RecordedDecision | RecordedTransitionDecision>>
  >({});
  const { decided: takeOffTheCount } = usePendingCountUpdates();
  const mounted = useRef(true);
  // The input kept in the tab (after an expired session or an outage) is given back once, to its owner only.
  const [kept, setKept] = useState<Readonly<Record<string, KeptDecision>>>({});
  const restored = useRef(false);
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    setKept(restoreDecisionInputs(store, owner));
  }, [store, owner]);

  // Announced once the cards that open again are on screen; an input kept for a proposal no longer in the queue
  // (decided meanwhile) is told too, rather than silently dropped.
  const proposals = queue.status === 'loaded' ? queue.proposals : null;
  const announced = useRef(false);
  useEffect(() => {
    if (announced.current || !proposals) return;
    const ids = new Set(proposals.map((proposal) => proposal.id));
    const keptIds = Object.keys(kept);
    const messages = [
      keptIds.some((id) => ids.has(id)) && validationLabels.inputRestored,
      keptIds.some((id) => !ids.has(id)) && validationLabels.keptInputDecided,
    ].filter(Boolean);
    if (messages.length === 0) return;
    announced.current = true;
    announce(messages.join(' '));
  }, [proposals, kept, announce]);

  const load = useCallback(async () => {
    const answer = await getValidationQueue(gateway);
    if (!mounted.current) return null;
    setQueue(
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

  // Expired while the page opened: the session ends on the site too (the sign-in page would otherwise send back
  // here), then the validator signs in again and comes back here.
  const expired = queue.status === 'failed' && queue.error.kind === 'session-expired';
  const [signInAgain, setSignInAgain] = useState(false);
  useEffect(() => {
    if (!expired) return;
    sessionExpired();
    setSignInAgain(true);
  }, [expired, sessionExpired]);

  const recorded = (id: string, decision: RecordedDecision | RecordedTransitionDecision) => {
    setDecided((current) => ({ ...current, [id]: decision }));
    takeOffTheCount();
  };

  const retry = async () => {
    setRetrying(true);
    const answer = await load();
    setRetrying(false);
    // The alert is already on screen: a new failure is announced, a success gives the focus back to the title.
    if (answer?.ok) focusPageTitle();
    else announce(validationLabels.loadingFailed);
  };

  switch (queue.status) {
    case 'loading':
      return (
        <p role="status" className="follow-up-page__status">
          {validationLabels.loading}
        </p>
      );
    case 'failed':
      if (expired) return signInAgain ? <Navigate to={signInPath(validationPath)} replace /> : null;
      if (queue.error.kind === 'role-withdrawn') return <RoleWithdrawn />;
      if (queue.error.kind === 'outdated') return <OutdatedSite />;
      return <LoadingFailure retrying={retrying} onRetry={() => void retry()} />;
  }
  if (!proposals) return null;
  if (proposals.length === 0) return <EmptyQueue />;
  return (
    <>
      <p className="follow-up-page__introduction">{validationLabels.introduction}</p>
      {/* Not a live region: each decision already has its report, which takes the focus. */}
      <p className="follow-up-page__count">
        {pendingCountLabel(proposals.length - Object.keys(decided).length)}
      </p>
      {/* role="list" restores the list semantics that some browsers drop with "list-style: none". */}
      <ul className="validation-queue" role="list">
        {proposals.map((proposal) => (
          <li key={proposal.id}>
            {decided[proposal.id] ? (
              <DecisionReport recorded={decided[proposal.id]!} />
            ) : proposal.kind === 'transition-proposal' ? (
              <TransitionProposalCard
                proposal={proposal}
                owner={owner}
                kept={kept[proposal.id]}
                onDecided={(decision) => recorded(proposal.id, decision)}
              />
            ) : (
              <ProposalCard
                proposal={proposal}
                owner={owner}
                kept={kept[proposal.id]}
                onDecided={(decision) => recorded(proposal.id, decision)}
              />
            )}
          </li>
        ))}
      </ul>
    </>
  );
}
