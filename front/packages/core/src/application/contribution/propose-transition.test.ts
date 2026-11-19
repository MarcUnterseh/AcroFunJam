import { describe, expect, it } from 'vitest';
import { fail, ok, type Result } from '../../domain/common/result';
import type { ChoosableTag } from '../../domain/shared-kernel/tags';
import type {
  TransitionPose,
  TransitionProposalInput,
  ValidTransitionProposal,
} from '../../domain/contribution/transition-proposal';
import {
  openTransitionProposal,
  proposeTransition,
  restoreTransitionInput,
  type ProposeTransitionError,
} from './propose-transition';
import type { KeptTransitionInput, TransitionInputStore } from './TransitionInputStorePort';
import type {
  TransitionPosesFailure,
  TransitionProposalFailure,
  TransitionProposalGateway,
  TransitionProposalOutcome,
} from './TransitionProposalGateway';

const throne: TransitionPose = { id: 'pose-throne', name: 'Throne' };
const bird: TransitionPose = { id: 'pose-bird', name: 'Bird' };
const owner = 'alice@example.org';
const dynamique: ChoosableTag = {
  id: 'tag-dynamique',
  name: 'dynamique',
  description: 'Avec élan.',
  impliedTagId: null,
  scope: 'transitions',
};
const pop: ChoosableTag = {
  id: 'tag-pop',
  name: 'pop',
  description: 'Propulsé.',
  impliedTagId: 'tag-dynamique',
  scope: 'transitions',
};
const vrille: ChoosableTag = {
  id: 'tag-vrille',
  name: 'vrille',
  description: 'Rotation.',
  impliedTagId: null,
  scope: 'transitions',
};

const throneToBird: TransitionProposalInput = {
  fromPoseId: 'pose-throne',
  toPoseId: 'pose-bird',
  name: '',
  baseDifficulty: 'beginner',
  flyerDifficulty: 'beginner',
  description: '',
  tags: [],
};

const pending: TransitionProposalOutcome = { status: 'pending', fromPose: throne, toPose: bird, name: null };

class FakeGateway implements TransitionProposalGateway {
  poses: Result<readonly TransitionPose[], TransitionPosesFailure> = ok([bird, throne]);
  tags: Result<readonly ChoosableTag[], TransitionPosesFailure> = ok([dynamique, pop, vrille]);
  answer: Result<TransitionProposalOutcome, TransitionProposalFailure> = ok(pending);
  readonly sent: ValidTransitionProposal[] = [];
  listPublishedPoses = async () => this.poses;
  listTags = async () => this.tags;
  proposeTransition = async (transition: ValidTransitionProposal) => {
    this.sent.push(transition);
    return this.answer;
  };
}

class MemoryStore implements TransitionInputStore {
  readonly kept = new Map<string, KeptTransitionInput>();
  load = (originPoseId: string) => this.kept.get(originPoseId) ?? null;
  save = (originPoseId: string, kept: KeptTransitionInput) => void this.kept.set(originPoseId, kept);
  clear = (originPoseId: string) => void this.kept.delete(originPoseId);
}

describe('openTransitionProposal', () => {
  it('should give the published poses, in the order received, and the departure pose consulted', async () => {
    const result = await openTransitionProposal(new FakeGateway(), 'pose-throne');

    expect(result).toEqual(ok({ poses: [bird, throne], fromPose: throne, tags: [dynamique, pop, vrille] }));
  });

  it.each<TransitionPosesFailure>([{ kind: 'unreachable' }, { kind: 'outdated' }])(
    'should tell why the list of tags could not be read ($kind)',
    async (failure) => {
      const gateway = new FakeGateway();
      gateway.tags = fail(failure);

      expect(await openTransitionProposal(gateway, 'pose-throne')).toEqual(fail(failure));
    },
  );

  // Story 9a (ADR 0035): a tag reserved to the poses is never offered for a transition.
  it('should offer only the tags that apply to transitions', async () => {
    const gateway = new FakeGateway();
    const contrepoids: ChoosableTag = {
      ...vrille,
      id: 'tag-contrepoids',
      name: 'contrepoids',
      scope: 'poses',
    };
    gateway.tags = ok([contrepoids, dynamique, pop]);

    expect(await openTransitionProposal(gateway, 'pose-throne')).toEqual(
      ok({ poses: [bird, throne], fromPose: throne, tags: [dynamique, pop] }),
    );
  });

  it('should tell a departure pose that is not among the published poses as not found', async () => {
    expect(await openTransitionProposal(new FakeGateway(), 'pose-unknown')).toEqual(
      fail({ kind: 'not-found' }),
    );
  });

  it.each<TransitionPosesFailure>([{ kind: 'unreachable' }, { kind: 'outdated' }])(
    'should tell why the poses could not be read ($kind)',
    async (failure) => {
      const gateway = new FakeGateway();
      gateway.poses = fail(failure);

      expect(await openTransitionProposal(gateway, 'pose-throne')).toEqual(fail(failure));
    },
  );
});

describe('proposeTransition', () => {
  it('should send the checked transition, then forget the kept input of the form', async () => {
    const gateway = new FakeGateway();
    const store = new MemoryStore();
    store.save('pose-throne', { owner, input: throneToBird });

    const result = await proposeTransition(gateway, store, 'pose-throne', throneToBird, owner);

    expect(result).toEqual(ok(pending));
    expect(gateway.sent).toEqual([
      {
        fromPoseId: 'pose-throne',
        toPoseId: 'pose-bird',
        name: null,
        baseDifficulty: 'beginner',
        flyerDifficulty: 'beginner',
        description: null,
        tags: [],
      },
    ]);
    expect(store.load('pose-throne')).toBeNull();
  });

  it('should send the chosen tags', async () => {
    const gateway = new FakeGateway();
    const tags = [
      { id: 'tag-dynamique', name: 'dynamique' },
      { id: 'tag-pop', name: 'pop' },
    ];

    await proposeTransition(gateway, new MemoryStore(), 'pose-throne', { ...throneToBird, tags }, owner);

    expect(gateway.sent[0]?.tags).toEqual(tags);
  });

  it('should name the chosen tags no longer in the list, without keeping the input', async () => {
    const gateway = new FakeGateway();
    gateway.answer = fail({ kind: 'tags-not-in-list', tagIds: ['tag-vrille'] });
    const store = new MemoryStore();
    const tags = [
      { id: 'tag-pop', name: 'pop' },
      { id: 'tag-vrille', name: 'vrille' },
    ];

    expect(await proposeTransition(gateway, store, 'pose-throne', { ...throneToBird, tags }, owner)).toEqual(
      fail({ kind: 'tags-not-in-list', tags: [{ id: 'tag-vrille', name: 'vrille' }] }),
    );
    expect(store.load('pose-throne')).toBeNull();
  });

  it('should send nothing when the input breaks a rule, every error reported', async () => {
    const gateway = new FakeGateway();

    const result = await proposeTransition(
      gateway,
      new MemoryStore(),
      'pose-throne',
      { ...throneToBird, toPoseId: '', baseDifficulty: null },
      owner,
    );

    expect(result).toEqual(
      fail({
        kind: 'invalid-input',
        errors: [
          { field: 'toPoseId', code: 'contribution.to-pose-required' },
          { field: 'baseDifficulty', code: 'pose.base-difficulty-required' },
        ],
      }),
    );
    expect(gateway.sent).toEqual([]);
  });

  it.each<[TransitionProposalFailure, ProposeTransitionError]>([
    [{ kind: 'transition-name-already-in-catalog' }, { kind: 'transition-name-already-in-catalog' }],
    [{ kind: 'transition-name-already-pending' }, { kind: 'transition-name-already-pending' }],
    [{ kind: 'unnamed-transition-already-in-catalog' }, { kind: 'unnamed-transition-already-in-catalog' }],
    [{ kind: 'unnamed-transition-already-pending' }, { kind: 'unnamed-transition-already-pending' }],
    [{ kind: 'from-pose-not-found' }, { kind: 'pose-not-found', field: 'fromPoseId' }],
    [{ kind: 'to-pose-not-found' }, { kind: 'pose-not-found', field: 'toPoseId' }],
  ])('should translate the refusal %o for the form, without keeping the input', async (failure, error) => {
    const gateway = new FakeGateway();
    gateway.answer = fail(failure);
    const store = new MemoryStore();

    expect(await proposeTransition(gateway, store, 'pose-throne', throneToBird, owner)).toEqual(fail(error));
    expect(store.load('pose-throne')).toBeNull();
  });

  it.each<[TransitionProposalFailure, ProposeTransitionError]>([
    [{ kind: 'unauthenticated' }, { kind: 'session-expired' }],
    [{ kind: 'unreachable' }, { kind: 'unreachable' }],
    [{ kind: 'outdated' }, { kind: 'outdated' }],
  ])('should keep the input for its owner and its pose of origin after %o', async (failure, error) => {
    const gateway = new FakeGateway();
    gateway.answer = fail(failure);
    const store = new MemoryStore();

    expect(await proposeTransition(gateway, store, 'pose-throne', throneToBird, owner)).toEqual(fail(error));
    expect(store.load('pose-throne')).toEqual({ owner, input: throneToBird });
  });
});

describe('restoreTransitionInput', () => {
  it('should give the kept input of the pose of origin back once, to its owner', () => {
    const store = new MemoryStore();
    store.save('pose-throne', { owner, input: throneToBird });

    expect(restoreTransitionInput(store, 'pose-throne', owner)).toEqual(throneToBird);
    expect(restoreTransitionInput(store, 'pose-throne', owner)).toBeNull();
  });

  it('should forget the input of someone else (shared device)', () => {
    const store = new MemoryStore();
    store.save('pose-throne', { owner: 'chloe@example.org', input: throneToBird });

    expect(restoreTransitionInput(store, 'pose-throne', owner)).toBeNull();
    expect(store.load('pose-throne')).toBeNull();
  });
});
