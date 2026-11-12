import {
  fail,
  ok,
  type Acceptance,
  type AcceptanceOutcome,
  type AccessFailure,
  type DecisionFailure,
  type DecisionInputStore,
  type KeptDecisionInputs,
  type PendingProposal,
  type PoseName,
  type RejectionReason,
  type ValidationGateway,
  type AuthFailure,
  type AuthGateway,
  type Capability,
  type CatalogGateway,
  type ContributionGateway,
  type KeptProposalInput,
  type MyProposal,
  type MyProposalsFailure,
  type ProposalFailure,
  type ProposalInputStore,
  type ProposalOutcome,
  type Result,
  type SessionMemory,
  type ValidPoseProposal,
} from '@acrofunjam/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { createMemoryRouter, RouterProvider, useLocation } from 'react-router';
import { CatalogGatewayProvider } from '../catalog/CatalogGatewayContext';
import { ContributionProvider } from '../contribution/ContributionContext';
import { ValidationProvider } from '../contribution/ValidationContext';
import { IdentityProvider } from '../identity/IdentityContext';
import { routes } from '../routes';

type ProposalAnswer = Result<ProposalOutcome, ProposalFailure>;

/** Answers the proposals in turn (the last answer is repeated); an answer can be held back until released. */
export class FakeContributionGateway implements ContributionGateway {
  sent: ValidPoseProposal[] = [];
  private readonly answers: Array<ProposalAnswer | 'held'>;
  private readonly held: Array<(answer: ProposalAnswer) => void> = [];

  constructor(...answers: Array<ProposalAnswer | 'held'>) {
    this.answers = answers.length > 0 ? answers : [ok({ status: 'pending', name: 'Throne' })];
  }

  async proposePose(proposal: ValidPoseProposal) {
    this.sent.push(proposal);
    const next = this.answers.length > 1 ? this.answers.shift()! : this.answers[0]!;
    if (next !== 'held') return next;
    return new Promise<ProposalAnswer>((resolve) => this.held.push(resolve));
  }

  release(answer: ProposalAnswer) {
    this.held.shift()!(answer);
  }

  /** The proposals of the requester (story 5), answered in turn (the last answer is repeated). */
  readonly myProposals = new Answers<Result<readonly MyProposal[], MyProposalsFailure>>([ok([])]);
  myProposalsRequests = 0;
  getMyProposals = () => {
    this.myProposalsRequests += 1;
    return this.myProposals.next();
  };
}

export class MemoryProposalInputStore implements ProposalInputStore {
  kept: KeptProposalInput | null;
  constructor(kept: KeptProposalInput | null = null) {
    this.kept = kept;
  }
  load = () => this.kept;
  save = (kept: KeptProposalInput) => {
    this.kept = kept;
  };
  clear = () => {
    this.kept = null;
  };
}

/** A proposal pending validation, made by Alice on 3 November 2026 unless stated otherwise. */
export const aPendingProposal = (overrides: Partial<PendingProposal> = {}): PendingProposal => ({
  id: 'proposal-throne',
  pose: {
    name: 'Throne' as PoseName,
    baseDifficulty: 'beginner',
    flyerDifficulty: 'discovery',
    canStartFlow: true,
    canEndFlow: true,
  },
  contributor: { email: 'alice@example.org', isYou: false },
  submittedAt: new Date('2026-11-03T09:00:00Z'),
  ...overrides,
});

/** A proposal of the requester (story 5): Throne, proposed on 3 November 2026, pending unless stated otherwise. */
export const aMyProposal = (overrides: Partial<MyProposal> = {}): MyProposal => ({
  id: 'proposal-throne',
  pose: aPendingProposal().pose,
  submittedAt: new Date('2026-11-03T09:00:00Z'),
  status: { kind: 'pending' },
  ...overrides,
});

type Held<T> = T | 'held';
type DecisionAnswer<T> = Result<T, DecisionFailure>;

/** Takes the next answer (the last one is repeated); an answer can be held back until released. */
class Answers<T> {
  private readonly answers: Array<Held<T>>;
  private readonly held: Array<(answer: T) => void> = [];
  constructor(answers: Array<Held<T>>) {
    this.answers = answers;
  }
  set(...answers: Array<Held<T>>) {
    this.answers.splice(0, this.answers.length, ...answers);
  }
  next(): Promise<T> {
    const next = this.answers.length > 1 ? this.answers.shift()! : this.answers[0]!;
    if (next !== 'held') return Promise.resolve(next);
    return new Promise<T>((resolve) => this.held.push(resolve));
  }
  release(answer: T) {
    this.held.shift()!(answer);
  }
}

/** The validation API of Contribution: the queue, its count, and the decisions, recorded as sent. */
export class FakeValidationGateway implements ValidationGateway {
  readonly queue = new Answers<Result<readonly PendingProposal[], AccessFailure>>([ok([])]);
  readonly count = new Answers<Result<number, AccessFailure>>([ok(0)]);
  readonly acceptance = new Answers<DecisionAnswer<AcceptanceOutcome>>([
    ok({ name: 'Throne', adjusted: false }),
  ]);
  readonly rejection = new Answers<DecisionAnswer<void>>([ok(undefined)]);
  countRequests = 0;
  readonly accepted: Array<{ id: string; acceptance: Acceptance }> = [];
  readonly rejected: Array<{ id: string; reason: RejectionReason }> = [];

  constructor(...proposals: PendingProposal[]) {
    this.queue.set(ok(proposals));
    this.count.set(ok(proposals.length));
  }

  queueRequests = 0;
  getValidationQueue = () => {
    this.queueRequests += 1;
    return this.queue.next();
  };
  countPendingProposals = () => {
    this.countRequests += 1;
    return this.count.next();
  };
  acceptProposal = (id: string, acceptance: Acceptance) => {
    this.accepted.push({ id, acceptance });
    return this.acceptance.next();
  };
  rejectProposal = (id: string, reason: RejectionReason) => {
    this.rejected.push({ id, reason });
    return this.rejection.next();
  };
}

export class MemoryDecisionInputStore implements DecisionInputStore {
  kept: KeptDecisionInputs | null;
  constructor(kept: KeptDecisionInputs | null = null) {
    this.kept = kept;
  }
  load = () => this.kept;
  save = (kept: KeptDecisionInputs) => {
    this.kept = kept;
  };
  clear = () => {
    this.kept = null;
  };
}

export class FakeAuthGateway implements AuthGateway {
  calls: string[] = [];
  /** The account of the session; a user's capabilities unless stated otherwise. */
  account: { email: string; capabilities?: Capability[] } | null = null;
  signInAnswer: Result<void, AuthFailure> = ok(undefined);
  registerAnswer: Result<void, AuthFailure> = ok(undefined);

  async signIn(credentials: { email: string }) {
    this.calls.push('signIn');
    if (this.signInAnswer.ok) this.account = { email: credentials.email };
    return this.signInAnswer;
  }
  async register() {
    this.calls.push('register');
    return this.registerAnswer;
  }
  async signOut() {
    this.calls.push('signOut');
    this.account = null;
    return ok(undefined);
  }
  /** /me cannot be reached (outage). */
  accountUnreachable = false;
  async currentAccount() {
    if (this.accountUnreachable) return fail('unreachable' as const);
    return ok(this.account && { capabilities: ['propose' as const], ...this.account });
  }
  unreachable() {
    this.signInAnswer = fail('unreachable');
  }
}

export class FakeSessionMemory implements SessionMemory {
  hadSession: boolean;
  constructor(hadSession = false) {
    this.hadSession = hadSession;
  }
  wasSignedIn = () => this.hadSession;
  remember = () => {
    this.hadSession = true;
  };
  forget = () => {
    this.hadSession = false;
  };
  onChange = () => () => {};
}

/** Shows the current location, to check where a page navigates to. */
export function CurrentLocation() {
  const location = useLocation();
  return <div aria-label="Adresse courante">{location.pathname + location.search}</div>;
}

/** Renders the whole site (layout + routes) at the given path, with fake adapters. */
export const renderSite = (
  path: string,
  {
    gateway = new FakeAuthGateway(),
    memory = new FakeSessionMemory(),
    catalog = { listPublishedPoses: async () => ok([]) },
    contribution = new FakeContributionGateway(),
    store = new MemoryProposalInputStore(),
    validation = new FakeValidationGateway(),
    decisionStore = new MemoryDecisionInputStore(),
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } }),
  }: {
    gateway?: FakeAuthGateway;
    memory?: FakeSessionMemory;
    catalog?: CatalogGateway;
    contribution?: FakeContributionGateway;
    store?: MemoryProposalInputStore;
    validation?: FakeValidationGateway;
    decisionStore?: MemoryDecisionInputStore;
    queryClient?: QueryClient;
  } = {},
  extra?: ReactNode,
) => {
  const router = createMemoryRouter(routes(extra), { initialEntries: [path] });
  const view = render(
    <QueryClientProvider client={queryClient}>
      <CatalogGatewayProvider gateway={catalog}>
        <ContributionProvider gateway={contribution} store={store}>
          <ValidationProvider gateway={validation} store={decisionStore}>
            <IdentityProvider gateway={gateway} memory={memory} forgetOnSignOut={[store, decisionStore]}>
              <RouterProvider router={router} />
            </IdentityProvider>
          </ValidationProvider>
        </ContributionProvider>
      </CatalogGatewayProvider>
    </QueryClientProvider>,
  );
  return { ...view, gateway, memory, router, contribution, store, validation, decisionStore, queryClient };
};
