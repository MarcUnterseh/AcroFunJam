import {
  fail,
  ok,
  type Acceptance,
  type AcceptanceOutcome,
  type AccessFailure,
  type DecisionFailure,
  type DecisionInputStore,
  type KeptDecisionInputs,
  type PendingPoseProposal,
  type PendingPoseRevision,
  type PendingProposal,
  type PoseName,
  type ProposalReference,
  type KeptRevisionInput,
  type PendingRevision,
  type PoseRevisionGateway,
  type RevisablePose,
  type RevisionFailure,
  type RevisionInputStore,
  type RevisionOpeningFailure,
  type ValidPoseRevision,
  type RejectionReason,
  type ValidationGateway,
  type AuthFailure,
  type AuthGateway,
  type Capability,
  type CatalogGateway,
  type ContributionGateway,
  type KeptProposalInput,
  type MyProposal,
  type MyPoseProposal,
  type MyPoseRevision,
  type MyProposalsFailure,
  type PosePage,
  type PosePageFailure,
  type PosePageGateway,
  type ProposalFailure,
  type ProposalInputStore,
  type ProposalOutcome,
  type Result,
  type SessionMemory,
  type ValidPoseProposal,
  type KeptTransitionInput,
  type MyTransitionProposal,
  type PendingTransitionProposal,
  type TransitionAcceptance,
  type TransitionAcceptanceOutcome,
  type TransitionDescription,
  type TransitionInputStore,
  type TransitionName,
  type TransitionPose,
  type TransitionPosesFailure,
  type TransitionProposalFailure,
  type TransitionProposalGateway,
  type TransitionProposalOutcome,
  type ValidTransitionProposal,
  type Tag,
  type TagChangeFailure,
  type TagListFailure,
  type TagListGateway,
  type TagRemovalFailure,
  type ValidTagContent,
  type ChoosableTag,
  type PoseTaggingFailure,
  type PoseTaggingGateway,
  type TagTransitionFailure,
  type TransitionTaggingGateway,
} from '@acrofunjam/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { createMemoryRouter, RouterProvider, useLocation } from 'react-router';
import { CatalogGatewayProvider } from '../catalog/CatalogGatewayContext';
import { PosePageProvider } from '../catalog/PosePageContext';
import { TagListProvider } from '../catalog/TagListContext';
import { PoseTaggingProvider } from '../catalog/PoseTaggingContext';
import { TransitionTaggingProvider } from '../catalog/TransitionTaggingContext';
import { ContributionProvider } from '../contribution/ContributionContext';
import { PoseRevisionProvider } from '../contribution/PoseRevisionContext';
import { TransitionProposalProvider } from '../contribution/TransitionProposalContext';
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

  /** Story 9a: the tags of the list, to choose those of a pose. */
  readonly tags = new Answers<Result<readonly ChoosableTag[], { readonly kind: 'unreachable' | 'outdated' }>>(
    [ok(seededTags)],
  );

  listTags = () => this.tags.next();

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

const star: TransitionPose = { id: 'pose-star', name: 'Star' };

const listed = (name: string, description: string, impliedTagId: string | null = null): Tag => ({
  id: `tag-${name}`,
  name,
  description,
  // Story 9a (ADR 0035): « inversion » and « lunaire » apply to the poses and the transitions, the others to the transitions.
  scope: name === 'inversion' || name === 'lunaire' ? 'poses-and-transitions' : 'transitions',
  impliedTagId,
  poseCount: 0,
  transitionCount: 0,
});

/** The list of tags as seeded (story 8, ADR 0032), in catalog order: « pop », « whip » and « icarien » add « dynamique ». */
export const seededTags: readonly Tag[] = [
  listed('dynamique', "Le passage se fait avec de l'élan."),
  listed('icarien', 'La base fait tourner le flyer avec les pieds.', 'tag-dynamique'),
  listed('inversion', 'Le flyer passe tête en bas.'),
  listed('lunaire', 'Une transition lente et contrôlée.'),
  listed(
    'pop',
    "La base propulse le flyer, qui quitte un instant tout contact avec elle avant d'être rattrapé.",
    'tag-dynamique',
  ),
  listed('vrille', 'Le flyer tourne autour de son axe.'),
  listed('whip', 'Le flyer est fouetté autour de la base.', 'tag-dynamique'),
];

/** A tag of the seeded list, as a transition carries it (its id and its name). */
export const tagNamed = (name: string) => {
  const tag = seededTags.find((t) => t.name === name)!;
  return { id: tag.id, name: tag.name };
};

/**
 * A transition pending validation (story 7): Alice proposes on 14 November 2026 « Ninja Star », from Star to Star,
 * advanced / advanced, with a video link as description, unless stated otherwise.
 */
export const aPendingTransition = (
  overrides: Partial<PendingTransitionProposal> = {},
): PendingTransitionProposal => ({
  kind: 'transition-proposal',
  id: 'transition-ninja-star',
  fromPose: star,
  toPose: star,
  transition: {
    name: 'Ninja Star' as TransitionName,
    baseDifficulty: 'advanced',
    flyerDifficulty: 'advanced',
    description: 'Vidéo : https://example.org/ninja-star' as TransitionDescription,
    tags: [],
  },
  contributor: { email: 'alice@example.org', isYou: false },
  submittedAt: new Date('2026-11-14T09:00:00Z'),
  ...overrides,
});

/** A transition of the requester (story 7): « Ninja Star », from Star to Star, pending unless stated otherwise. */
export const aMyTransition = (overrides: Partial<MyTransitionProposal> = {}): MyTransitionProposal => ({
  kind: 'transition-proposal',
  id: 'transition-ninja-star',
  fromPose: star,
  toPose: star,
  transition: aPendingTransition().transition,
  submittedAt: new Date('2026-11-14T09:00:00Z'),
  status: { kind: 'pending' },
  ...overrides,
});

/** A proposal pending validation, made by Alice on 3 November 2026 unless stated otherwise. */
export const aPendingProposal = (overrides: Partial<PendingPoseProposal> = {}): PendingPoseProposal => ({
  kind: 'pose-proposal',
  id: 'proposal-throne',
  pose: {
    name: 'Throne' as PoseName,
    baseDifficulty: 'beginner',
    flyerDifficulty: 'discovery',
    canStartFlow: true,
    canEndFlow: true,
    tags: [],
  },
  contributor: { email: 'alice@example.org', isYou: false },
  submittedAt: new Date('2026-11-03T09:00:00Z'),
  ...overrides,
});

/**
 * A revision pending validation (story 6): Alice proposes on 12 November 2026 to change the flyer difficulty of
 * Throne (beginner / intermediate, can start and end a flow) to discovery, unless stated otherwise.
 */
export const aPendingRevision = (overrides: Partial<PendingPoseRevision> = {}): PendingPoseRevision => ({
  kind: 'pose-revision',
  id: 'revision-throne',
  pose: {
    id: 'pose-throne',
    name: 'Throne' as PoseName,
    baseDifficulty: 'beginner',
    flyerDifficulty: 'intermediate',
    canStartFlow: true,
    canEndFlow: true,
    tags: [],
  },
  changes: [{ field: 'flyerDifficulty', before: 'intermediate', after: 'discovery' }],
  message: null,
  contributor: { email: 'alice@example.org', isYou: false },
  submittedAt: new Date('2026-11-12T09:00:00Z'),
  ...overrides,
});

/** A proposal of the requester (story 5): Throne, proposed on 3 November 2026, pending unless stated otherwise. */
export const aMyProposal = (overrides: Partial<MyPoseProposal> = {}): MyPoseProposal => ({
  kind: 'pose-proposal',
  id: 'proposal-throne',
  pose: aPendingProposal().pose,
  submittedAt: new Date('2026-11-03T09:00:00Z'),
  status: { kind: 'pending' },
  ...overrides,
});

/**
 * A revision of the requester (story 6): the flyer difficulty of Throne, intermediate, proposed as discovery on 12
 * November 2026, pending unless stated otherwise.
 */
export const aMyRevision = (overrides: Partial<MyPoseRevision> = {}): MyPoseRevision => ({
  kind: 'pose-revision',
  id: 'revision-throne',
  poseName: 'Throne' as PoseName,
  submittedAt: new Date('2026-11-12T09:00:00Z'),
  status: { kind: 'pending' },
  changes: [{ field: 'flyerDifficulty', before: 'intermediate', after: 'discovery' }],
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
  /** Story 7: the acceptances of transitions, answered as Ninja Star published unless stated otherwise. */
  readonly transitionAcceptance = new Answers<DecisionAnswer<TransitionAcceptanceOutcome>>([
    ok({ name: 'Ninja Star', fromPose: star, toPose: star, adjusted: false }),
  ]);
  countRequests = 0;
  readonly accepted: Array<{ id: string; kind: string; acceptance: Acceptance }> = [];
  readonly acceptedTransitions: Array<{ id: string; kind: string; acceptance: TransitionAcceptance }> = [];
  readonly rejected: Array<{ id: string; kind: string; reason: RejectionReason }> = [];

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
  acceptProposal = ({ id, kind }: ProposalReference, acceptance: Acceptance) => {
    this.accepted.push({ id, kind, acceptance });
    return this.acceptance.next();
  };
  acceptTransitionProposal = ({ id, kind }: ProposalReference, acceptance: TransitionAcceptance) => {
    this.acceptedTransitions.push({ id, kind, acceptance });
    return this.transitionAcceptance.next();
  };
  rejectProposal = ({ id, kind }: ProposalReference, reason: RejectionReason) => {
    this.rejected.push({ id, kind, reason });
    return this.rejection.next();
  };
  /** Story 8: the list of tags, offered in the adjustment zone of a transition. */
  readonly tags = new Answers<Result<readonly ChoosableTag[], AccessFailure>>([ok(seededTags)]);
  listTags = () => this.tags.next();
}

/** Throne, published (version 1): beginner / intermediate, can start and end a flow (story 6). */
export const aRevisablePose = (overrides: Partial<RevisablePose> = {}): RevisablePose => ({
  id: 'pose-throne',
  name: 'Throne' as PoseName,
  baseDifficulty: 'beginner',
  flyerDifficulty: 'intermediate',
  canStartFlow: true,
  canEndFlow: true,
  tags: [],
  version: 1,
  ...overrides,
});

/** The revision of a published pose (story 6): the pose, its pending revision, and the revisions sent. */
export class FakePoseRevisionGateway implements PoseRevisionGateway {
  readonly pose = new Answers<Result<RevisablePose, RevisionOpeningFailure>>([ok(aRevisablePose())]);
  readonly pending = new Answers<Result<PendingRevision | null, RevisionOpeningFailure>>([ok(null)]);
  readonly answer = new Answers<Result<ProposalOutcome, RevisionFailure>>([
    ok({ status: 'pending', name: 'Throne' }),
  ]);
  readonly read: string[] = [];
  readonly sent: ValidPoseRevision[] = [];

  getRevisablePose = (poseId: string) => {
    this.read.push(poseId);
    return this.pose.next();
  };
  getPendingRevision = () => this.pending.next();
  proposePoseRevision = (revision: ValidPoseRevision) => {
    this.sent.push(revision);
    return this.answer.next();
  };
}

/** The page of a pose in the catalog (story 7): answered in turn (the last answer is repeated), the ids read. */
/**
 * The list of tags (story 8): the tags answered in turn (the last answer is repeated), and the changes sent, answered
 * as told.
 */
export class FakeTagListGateway implements TagListGateway {
  readonly tags: Answers<Result<readonly Tag[], TagListFailure>>;
  readonly added: ValidTagContent[] = [];
  readonly changed: Array<{ id: string; content: ValidTagContent }> = [];
  readonly removed: string[] = [];
  readonly changes = new Answers<Result<Tag, TagChangeFailure>>([fail({ kind: 'outdated' })]);
  readonly removals = new Answers<Result<void, TagRemovalFailure>>([ok(undefined)]);

  constructor(...answers: Array<Result<readonly Tag[], TagListFailure> | 'held'>) {
    this.tags = new Answers(answers.length > 0 ? answers : [ok([])]);
  }

  listTags = () => this.tags.next();

  addTag = (content: ValidTagContent) => {
    this.added.push(content);
    return this.changes.next();
  };

  changeTag = (id: string, content: ValidTagContent) => {
    this.changed.push({ id, content });
    return this.changes.next();
  };

  removeTag = (id: string) => {
    this.removed.push(id);
    return this.removals.next();
  };
}

export class FakePosePageGateway implements PosePageGateway {
  readonly page: Answers<Result<PosePage, PosePageFailure>>;
  readonly read: string[] = [];

  constructor(...answers: Array<Result<PosePage, PosePageFailure> | 'held'>) {
    this.page = new Answers(answers.length > 0 ? answers : [fail({ kind: 'not-found' })]);
  }

  getPosePage = (poseId: string) => {
    this.read.push(poseId);
    return this.page.next();
  };
}

/** Story 9a: tagging a published pose directly (ADR 0036), the tags sent, answered in turn. */
export class FakePoseTaggingGateway implements PoseTaggingGateway {
  readonly answer = new Answers<Result<void, PoseTaggingFailure>>([ok(undefined)]);
  readonly sent: Array<{ poseId: string; tagIds: readonly string[] }> = [];

  tagPose = (poseId: string, tagIds: readonly string[]) => {
    this.sent.push({ poseId, tagIds });
    return this.answer.next();
  };
}

/** Tagging a published transition (story 8): the tags sent, answered in turn. */
export class FakeTransitionTaggingGateway implements TransitionTaggingGateway {
  readonly answer = new Answers<Result<void, TagTransitionFailure>>([ok(undefined)]);
  readonly sent: Array<{ transitionId: string; tagIds: readonly string[] }> = [];

  tagTransition = (transitionId: string, tagIds: readonly string[]) => {
    this.sent.push({ transitionId, tagIds });
    return this.answer.next();
  };
}

/** The published poses of the catalog as the form « Proposer une transition » reads them: Bird, Star, Throne. */
export const transitionPoses: readonly TransitionPose[] = [
  { id: 'pose-bird', name: 'Bird' },
  star,
  { id: 'pose-throne', name: 'Throne' },
];

/** Proposing a transition (story 7): the published poses, and the transitions sent, answered in turn. */
export class FakeTransitionProposalGateway implements TransitionProposalGateway {
  readonly poses = new Answers<Result<readonly TransitionPose[], TransitionPosesFailure>>([
    ok(transitionPoses),
  ]);
  readonly answer = new Answers<Result<TransitionProposalOutcome, TransitionProposalFailure>>([
    ok({ status: 'pending', fromPose: transitionPoses[2]!, toPose: transitionPoses[0]!, name: null }),
  ]);
  readonly sent: ValidTransitionProposal[] = [];
  /** Story 8: the list of tags, offered by the form. */
  readonly tags = new Answers<Result<readonly ChoosableTag[], TransitionPosesFailure>>([ok(seededTags)]);

  listPublishedPoses = () => this.poses.next();
  listTags = () => this.tags.next();
  proposeTransition = (transition: ValidTransitionProposal) => {
    this.sent.push(transition);
    return this.answer.next();
  };
}

export class MemoryTransitionInputStore implements TransitionInputStore {
  readonly kept = new Map<string, KeptTransitionInput>();
  load = (originPoseId: string) => this.kept.get(originPoseId) ?? null;
  save = (originPoseId: string, kept: KeptTransitionInput) => {
    this.kept.set(originPoseId, kept);
  };
  clear = (originPoseId?: string) => {
    if (originPoseId === undefined) this.kept.clear();
    else this.kept.delete(originPoseId);
  };
}

export class MemoryRevisionInputStore implements RevisionInputStore {
  readonly kept = new Map<string, KeptRevisionInput>();
  load = (poseId: string) => this.kept.get(poseId) ?? null;
  save = (poseId: string, kept: KeptRevisionInput) => {
    this.kept.set(poseId, kept);
  };
  clear = (poseId?: string) => {
    if (poseId === undefined) this.kept.clear();
    else this.kept.delete(poseId);
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
    revision = new FakePoseRevisionGateway(),
    revisionStore = new MemoryRevisionInputStore(),
    posePage = new FakePosePageGateway(),
    tags = new FakeTagListGateway(),
    tagging = new FakeTransitionTaggingGateway(),
    poseTagging = new FakePoseTaggingGateway(),
    transitions = new FakeTransitionProposalGateway(),
    transitionStore = new MemoryTransitionInputStore(),
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } }),
  }: {
    gateway?: FakeAuthGateway;
    memory?: FakeSessionMemory;
    catalog?: CatalogGateway;
    contribution?: FakeContributionGateway;
    store?: MemoryProposalInputStore;
    validation?: FakeValidationGateway;
    decisionStore?: MemoryDecisionInputStore;
    revision?: FakePoseRevisionGateway;
    revisionStore?: MemoryRevisionInputStore;
    posePage?: FakePosePageGateway;
    tags?: TagListGateway;
    tagging?: FakeTransitionTaggingGateway;
    poseTagging?: FakePoseTaggingGateway;
    transitions?: FakeTransitionProposalGateway;
    transitionStore?: MemoryTransitionInputStore;
    queryClient?: QueryClient;
  } = {},
  extra?: ReactNode,
) => {
  const router = createMemoryRouter(routes(extra), { initialEntries: [path] });
  const view = render(
    <QueryClientProvider client={queryClient}>
      <CatalogGatewayProvider gateway={catalog}>
        <PosePageProvider gateway={posePage}>
          <TagListProvider gateway={tags}>
            <TransitionTaggingProvider gateway={tagging}>
              <PoseTaggingProvider gateway={poseTagging}>
                <ContributionProvider gateway={contribution} store={store}>
                  <ValidationProvider gateway={validation} store={decisionStore}>
                    <PoseRevisionProvider gateway={revision} store={revisionStore}>
                      <TransitionProposalProvider gateway={transitions} store={transitionStore}>
                        <IdentityProvider
                          gateway={gateway}
                          memory={memory}
                          forgetOnSignOut={[store, decisionStore, revisionStore, transitionStore]}
                        >
                          <RouterProvider router={router} />
                        </IdentityProvider>
                      </TransitionProposalProvider>
                    </PoseRevisionProvider>
                  </ValidationProvider>
                </ContributionProvider>
              </PoseTaggingProvider>
            </TransitionTaggingProvider>
          </TagListProvider>
        </PosePageProvider>
      </CatalogGatewayProvider>
    </QueryClientProvider>,
  );
  return {
    ...view,
    gateway,
    memory,
    router,
    contribution,
    store,
    validation,
    decisionStore,
    revision,
    revisionStore,
    posePage,
    tagging,
    transitions,
    transitionStore,
    queryClient,
  };
};
