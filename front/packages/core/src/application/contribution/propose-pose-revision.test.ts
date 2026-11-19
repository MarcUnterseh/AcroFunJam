import { describe, expect, it } from 'vitest';
import { fail, ok, type Result } from '../../domain/common/result';
import type {
  PoseRevisionInput,
  RevisablePose,
  ValidPoseRevision,
} from '../../domain/contribution/pose-revision';
import type { PoseName } from '../../domain/shared-kernel/pose-name';
import type { ProposalOutcome } from './ContributionGateway';
import type {
  PendingRevision,
  PoseRevisionGateway,
  RevisionFailure,
  RevisionOpeningFailure,
} from './PoseRevisionGateway';
import {
  keepRevisionInput,
  openPoseRevision,
  proposePoseRevision,
  restoreRevisionInput,
} from './propose-pose-revision';
import type { KeptRevisionInput, RevisionInputStore } from './RevisionInputStorePort';

const throne: RevisablePose = {
  id: 'pose-throne',
  name: 'Throne' as PoseName,
  baseDifficulty: 'beginner',
  flyerDifficulty: 'intermediate',
  canStartFlow: true,
  canEndFlow: true,
  tags: [],
  version: 1,
};

class FakeGateway implements PoseRevisionGateway {
  pose: Result<RevisablePose, RevisionOpeningFailure> = ok(throne);
  pending: Result<PendingRevision | null, RevisionOpeningFailure> = ok(null);
  answer: Result<ProposalOutcome, RevisionFailure> = ok({ status: 'pending', name: 'Throne' });
  readonly sent: ValidPoseRevision[] = [];
  readonly read: string[] = [];

  async getRevisablePose(poseId: string) {
    this.read.push(poseId);
    return this.pose;
  }

  async getPendingRevision() {
    return this.pending;
  }

  async proposePoseRevision(revision: ValidPoseRevision) {
    this.sent.push(revision);
    return this.answer;
  }
}

class FakeStore implements RevisionInputStore {
  readonly kept = new Map<string, KeptRevisionInput>();
  load = (poseId: string) => this.kept.get(poseId) ?? null;
  save = (poseId: string, kept: KeptRevisionInput) => {
    this.kept.set(poseId, kept);
  };
  clear = (poseId: string) => {
    this.kept.delete(poseId);
  };
}

const alice = 'alice@example.org';
const flyerToDiscovery: PoseRevisionInput = {
  values: { ...throne, flyerDifficulty: 'discovery' },
  message: '',
};
const setUp = () => ({ gateway: new FakeGateway(), store: new FakeStore() });

describe('openPoseRevision', () => {
  it('should give the pose with its current values and version, and no pending revision', async () => {
    const { gateway } = setUp();

    expect(await openPoseRevision(gateway, throne.id)).toEqual(ok({ pose: throne, pending: null }));
  });

  it('should tell whether the pending revision of the pose is the requester’s', async () => {
    const { gateway } = setUp();
    gateway.pending = ok({ isYours: true });

    expect(await openPoseRevision(gateway, throne.id)).toEqual(
      ok({ pose: throne, pending: { isYours: true } }),
    );
  });

  it.each([
    ['not-found', 'not-found'],
    ['unauthenticated', 'session-expired'],
    ['unreachable', 'unreachable'],
    ['outdated', 'outdated'],
  ] as const)('should report "%s" when reading the pose as "%s"', async (failure, error) => {
    const { gateway } = setUp();
    gateway.pose = fail({ kind: failure });

    expect(await openPoseRevision(gateway, throne.id)).toEqual(fail({ kind: error }));
  });

  it('should report an expired session when reading the pending revision', async () => {
    const { gateway } = setUp();
    gateway.pending = fail({ kind: 'unauthenticated' });

    expect(await openPoseRevision(gateway, throne.id)).toEqual(fail({ kind: 'session-expired' }));
  });
});

describe('proposePoseRevision', () => {
  it('should send the changed fields only, from the version read, and give what became of it', async () => {
    const { gateway, store } = setUp();

    const result = await proposePoseRevision(gateway, store, throne, flyerToDiscovery, alice);

    expect(gateway.sent).toEqual([
      {
        poseId: 'pose-throne',
        poseVersion: 1,
        changes: [{ field: 'flyerDifficulty', before: 'intermediate', after: 'discovery' }],
        message: null,
      },
    ]);
    expect(result).toEqual(ok({ status: 'pending', name: 'Throne' }));
  });

  it('should send nothing and tell nothing was changed when the input is the pose itself', async () => {
    const { gateway, store } = setUp();

    const result = await proposePoseRevision(
      gateway,
      store,
      throne,
      { values: throne, message: 'Rien.' },
      alice,
    );

    expect(result).toEqual(fail({ kind: 'changes-nothing' }));
    expect(gateway.sent).toEqual([]);
  });

  it('should send nothing and report the errors of the input', async () => {
    const { gateway, store } = setUp();

    const result = await proposePoseRevision(
      gateway,
      store,
      throne,
      { values: { ...throne, name: '  ' }, message: '' },
      alice,
    );

    expect(result).toEqual(
      fail({ kind: 'invalid-input', errors: [{ field: 'name', code: 'pose.name-required' }] }),
    );
    expect(gateway.sent).toEqual([]);
  });

  it('should forget the kept input of the pose once the revision is received', async () => {
    const { gateway, store } = setUp();
    store.kept.set(throne.id, { owner: alice, input: flyerToDiscovery });

    await proposePoseRevision(gateway, store, throne, flyerToDiscovery, alice);

    expect(store.kept.size).toBe(0);
  });

  it.each([
    ['unauthenticated', 'session-expired'],
    ['unreachable', 'unreachable'],
    ['outdated', 'outdated'],
  ] as const)(
    'should keep the input for its owner and its pose when the API answers "%s"',
    async (failure, error) => {
      const { gateway, store } = setUp();
      gateway.answer = fail({ kind: failure });

      const result = await proposePoseRevision(gateway, store, throne, flyerToDiscovery, alice);

      expect(result).toEqual(fail({ kind: error }));
      expect(store.kept.get(throne.id)).toEqual({ owner: alice, input: flyerToDiscovery });
    },
  );

  it.each([
    'name-already-in-catalog',
    'name-already-pending',
    'revision-already-pending',
    'not-found',
    'changes-nothing',
  ] as const)('should report the refusal "%s" as such', async (failure) => {
    const { gateway, store } = setUp();
    gateway.answer = fail({ kind: failure });

    expect(await proposePoseRevision(gateway, store, throne, flyerToDiscovery, alice)).toEqual(
      fail({ kind: failure }),
    );
  });

  it('should read the pose again when it changed meanwhile, and give its new values', async () => {
    const { gateway, store } = setUp();
    const changed: RevisablePose = { ...throne, baseDifficulty: 'intermediate', version: 2 };
    gateway.answer = fail({ kind: 'pose-changed' });
    gateway.pose = ok(changed);

    const result = await proposePoseRevision(gateway, store, throne, flyerToDiscovery, alice);

    expect(result).toEqual(fail({ kind: 'pose-changed', pose: changed }));
    expect(gateway.read).toEqual([throne.id]);
  });
});

describe('restoreRevisionInput', () => {
  it('should give the kept input of the pose once, to its owner', () => {
    const store = new FakeStore();
    keepRevisionInput(store, throne.id, flyerToDiscovery, alice);

    expect(restoreRevisionInput(store, throne.id, alice)).toEqual(flyerToDiscovery);
    expect(restoreRevisionInput(store, throne.id, alice)).toBeNull();
  });

  it('should give nothing, and forget it, when the input belongs to someone else (shared device)', () => {
    const store = new FakeStore();
    keepRevisionInput(store, throne.id, flyerToDiscovery, 'chloe@example.org');

    expect(restoreRevisionInput(store, throne.id, alice)).toBeNull();
    expect(store.kept.size).toBe(0);
  });

  it('should keep the input of each pose apart', () => {
    const store = new FakeStore();
    keepRevisionInput(store, 'pose-bird', flyerToDiscovery, alice);

    expect(restoreRevisionInput(store, throne.id, alice)).toBeNull();
    expect(store.kept.has('pose-bird')).toBe(true);
  });
});
