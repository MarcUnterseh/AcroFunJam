import {
  fail,
  ok,
  type AuthFailure,
  type AuthGateway,
  type Capability,
  type CatalogGateway,
  type ContributionGateway,
  type KeptProposalInput,
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
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } }),
  }: {
    gateway?: FakeAuthGateway;
    memory?: FakeSessionMemory;
    catalog?: CatalogGateway;
    contribution?: FakeContributionGateway;
    store?: MemoryProposalInputStore;
    queryClient?: QueryClient;
  } = {},
  extra?: ReactNode,
) => {
  const router = createMemoryRouter(routes(extra), { initialEntries: [path] });
  const view = render(
    <QueryClientProvider client={queryClient}>
      <CatalogGatewayProvider gateway={catalog}>
        <ContributionProvider gateway={contribution} store={store}>
          <IdentityProvider gateway={gateway} memory={memory} forgetOnSignOut={[store]}>
            <RouterProvider router={router} />
          </IdentityProvider>
        </ContributionProvider>
      </CatalogGatewayProvider>
    </QueryClientProvider>,
  );
  return { ...view, gateway, memory, router, contribution, store, queryClient };
};
