import { describe, expect, it } from 'vitest';
import { fail, ok, type Result } from '../../domain/common/result';
import type { RejectionReason } from '../../domain/contribution/rejection-reason';
import type { PoseName } from '../../domain/shared-kernel/pose-name';
import type { DecisionInputStore, KeptDecisionInputs } from './DecisionInputStorePort';
import {
  acceptProposal,
  countPendingProposals,
  getValidationQueue,
  keepDecisionInput,
  keepsDecisionInput,
  rejectProposal,
  restoreDecisionInputs,
} from './validation-use-cases';
import type {
  Acceptance,
  AcceptanceOutcome,
  AccessFailure,
  DecisionFailure,
  PendingPoseProposal,
  PendingPoseRevision,
  PendingProposal,
  ProposalReference,
  ValidationGateway,
} from './ValidationGateway';

class FakeValidationGateway implements ValidationGateway {
  queue: Result<readonly PendingProposal[], AccessFailure> = ok([]);
  count: Result<number, AccessFailure> = ok(0);
  acceptance: Result<AcceptanceOutcome, DecisionFailure> = ok({ name: 'Throne', adjusted: false });
  rejection: Result<void, DecisionFailure> = ok(undefined);
  readonly accepted: { id: string; kind: string; acceptance: Acceptance }[] = [];
  readonly rejected: { id: string; kind: string; reason: RejectionReason }[] = [];

  async getValidationQueue() {
    return this.queue;
  }

  async countPendingProposals() {
    return this.count;
  }

  async acceptProposal({ id, kind }: ProposalReference, acceptance: Acceptance) {
    this.accepted.push({ id, kind, acceptance });
    return this.acceptance;
  }

  async acceptTransitionProposal() {
    return fail({ kind: 'not-found' as const });
  }

  async listTags() {
    return ok([]);
  }

  async rejectProposal({ id, kind }: ProposalReference, reason: RejectionReason) {
    this.rejected.push({ id, kind, reason });
    return this.rejection;
  }
}

const throneByAlice: PendingPoseProposal = {
  kind: 'pose-proposal',
  id: '0b4c8e0e-2b2f-4f55-9d3a-0e6a3c1d8f10',
  pose: {
    name: 'Throne' as PoseName,
    baseDifficulty: 'beginner',
    flyerDifficulty: 'discovery',
    canStartFlow: true,
    canEndFlow: true,
  },
  contributor: { email: 'alice@example.org', isYou: false },
  submittedAt: new Date('2026-11-03T09:00:00Z'),
};

/** Alice proposes to change the flyer difficulty of Bird, intermediate today, to discovery (story 6). */
const revisionOfBird: PendingPoseRevision = {
  kind: 'pose-revision',
  id: '2a1b3c4d-5e6f-4a0b-8c9d-0e1f2a3b4c5d',
  pose: {
    id: '6f0d3c2a-9c71-4b1e-a7a2-1f4e5d6c7b80',
    name: 'Bird' as PoseName,
    baseDifficulty: 'discovery',
    flyerDifficulty: 'intermediate',
    canStartFlow: true,
    canEndFlow: true,
  },
  changes: [{ field: 'flyerDifficulty', before: 'intermediate', after: 'discovery' }],
  message: null,
  contributor: { email: 'alice@example.org', isYou: false },
  submittedAt: new Date('2026-11-12T09:00:00Z'),
};

describe('getValidationQueue', () => {
  it('should give the proposals pending validation, as the API orders them', async () => {
    const gateway = new FakeValidationGateway();
    const queue: PendingProposal[] = [throneByAlice, revisionOfBird];
    gateway.queue = ok(queue);

    expect(await getValidationQueue(gateway)).toEqual(ok(queue));
  });

  it.each([
    ['unauthenticated', 'session-expired'],
    ['forbidden', 'role-withdrawn'],
    ['unreachable', 'unreachable'],
    ['outdated', 'outdated'],
  ] as const)('should report "%s" from the API as "%s"', async (failure, error) => {
    const gateway = new FakeValidationGateway();
    gateway.queue = fail({ kind: failure });

    expect(await getValidationQueue(gateway)).toEqual(fail({ kind: error }));
  });
});

describe('countPendingProposals', () => {
  it('should give the number of proposals pending validation', async () => {
    const gateway = new FakeValidationGateway();
    gateway.count = ok(3);

    expect(await countPendingProposals(gateway)).toEqual(ok(3));
  });

  it('should report an expired session when the API no longer knows the person', async () => {
    const gateway = new FakeValidationGateway();
    gateway.count = fail({ kind: 'unauthenticated' });

    expect(await countPendingProposals(gateway)).toEqual(fail({ kind: 'session-expired' }));
  });
});

class FakeDecisionInputStore implements DecisionInputStore {
  kept: KeptDecisionInputs | null = null;
  load = () => this.kept;
  save = (kept: KeptDecisionInputs) => {
    this.kept = kept;
  };
  clear = () => {
    this.kept = null;
  };
}

const bruno = 'bruno@example.org';
const reason = "Ce n'est pas une pose tenable.";

const setUp = () => ({ gateway: new FakeValidationGateway(), store: new FakeDecisionInputStore() });

describe('rejectProposal', () => {
  it('should send nothing and report the missing reason when the reason is only spaces', async () => {
    const { gateway, store } = setUp();

    const result = await rejectProposal(gateway, store, throneByAlice, '   ', bruno);

    expect(result).toEqual(fail({ kind: 'invalid-reason', code: 'contribution.rejection-reason-required' }));
    expect(gateway.rejected).toEqual([]);
  });

  it('should send the reason without superfluous spaces and tell the proposal is rejected', async () => {
    const { gateway, store } = setUp();

    const result = await rejectProposal(gateway, store, throneByAlice, `  ${reason} `, bruno);

    expect(gateway.rejected).toEqual([{ id: throneByAlice.id, kind: 'pose-proposal', reason }]);
    expect(result).toEqual(ok(undefined));
  });

  it.each([
    ['already-decided', 'already-decided'],
    ['not-found', 'not-found'],
    ['unauthenticated', 'session-expired'],
    ['forbidden', 'role-withdrawn'],
    ['unreachable', 'unreachable'],
    ['outdated', 'outdated'],
  ] as const)('should report "%s" from the API as "%s"', async (failure, error) => {
    const { gateway, store } = setUp();
    gateway.rejection = fail({ kind: failure });

    expect(await rejectProposal(gateway, store, throneByAlice, reason, bruno)).toEqual(fail({ kind: error }));
  });

  it.each(['unauthenticated', 'unreachable', 'outdated'] as const)(
    'should keep the reason as typed, for its owner and its proposal, when the API answers "%s"',
    async (failure) => {
      const { gateway, store } = setUp();
      gateway.rejection = fail({ kind: failure });

      await rejectProposal(gateway, store, throneByAlice, reason, bruno);

      expect(store.kept).toEqual({
        owner: bruno,
        decisions: { [throneByAlice.id]: { kind: 'rejection', reason } },
      });
    },
  );
  it('should forget the kept input of this proposal only when the rejection is received', async () => {
    const { gateway, store } = setUp();
    const starId = 'f3a1c2d4-5b6e-4f70-8a91-b2c3d4e5f607';
    store.kept = {
      owner: bruno,
      decisions: {
        [throneByAlice.id]: { kind: 'rejection', reason },
        [starId]: { kind: 'rejection', reason: 'Doublon de Bird.' },
      },
    };

    await rejectProposal(gateway, store, throneByAlice, reason, bruno);

    expect(store.kept).toEqual({
      owner: bruno,
      decisions: { [starId]: { kind: 'rejection', reason: 'Doublon de Bird.' } },
    });
  });
  it('should send the rejection of a revision as such', async () => {
    const { gateway, store } = setUp();

    await rejectProposal(gateway, store, revisionOfBird, reason, bruno);

    expect(gateway.rejected).toEqual([{ id: revisionOfBird.id, kind: 'pose-revision', reason }]);
  });

  it('should leave the kept input of someone else untouched when the rejection is received', async () => {
    const { gateway, store } = setUp();
    const paulInput: KeptDecisionInputs = {
      owner: 'paul@example.org',
      decisions: { [throneByAlice.id]: { kind: 'rejection', reason: 'Doublon de Bird.' } },
    };
    store.kept = paulInput;

    await rejectProposal(gateway, store, throneByAlice, reason, bruno);

    expect(store.kept).toEqual(paulInput);
  });
});

describe('keepDecisionInput', () => {
  const starId = 'f3a1c2d4-5b6e-4f70-8a91-b2c3d4e5f607';

  it('should keep the input of the other proposals of the same owner', () => {
    const store = new FakeDecisionInputStore();
    store.kept = { owner: bruno, decisions: { [starId]: { kind: 'rejection', reason: 'Doublon de Bird.' } } };

    keepDecisionInput(store, bruno, throneByAlice.id, { kind: 'rejection', reason });

    expect(store.kept.decisions).toEqual({
      [starId]: { kind: 'rejection', reason: 'Doublon de Bird.' },
      [throneByAlice.id]: { kind: 'rejection', reason },
    });
  });

  it('should forget the input of someone else (shared device)', () => {
    const store = new FakeDecisionInputStore();
    store.kept = { owner: 'paul@example.org', decisions: { [starId]: { kind: 'rejection', reason } } };

    keepDecisionInput(store, bruno, throneByAlice.id, { kind: 'rejection', reason });

    expect(store.kept).toEqual({
      owner: bruno,
      decisions: { [throneByAlice.id]: { kind: 'rejection', reason } },
    });
  });
});

describe('keepsDecisionInput', () => {
  it.each(['session-expired', 'unreachable', 'outdated'] as const)(
    'should keep the input after the incident "%s", to be sent again',
    (kind) => {
      expect(keepsDecisionInput({ kind })).toBe(true);
    },
  );

  it.each([
    'role-withdrawn',
    'already-decided',
    'not-found',
    'name-already-in-catalog',
    'name-already-pending',
  ] as const)('should not keep the input after the refusal "%s"', (kind) => {
    expect(keepsDecisionInput({ kind })).toBe(false);
  });
});

describe('restoreDecisionInputs', () => {
  it('should give the kept inputs once, then forget them, when they belong to the signed-in person', () => {
    const store = new FakeDecisionInputStore();
    const decisions = { [throneByAlice.id]: { kind: 'rejection', reason } } as const;
    store.kept = { owner: bruno, decisions };

    expect(restoreDecisionInputs(store, bruno)).toEqual(decisions);
    expect(restoreDecisionInputs(store, bruno)).toEqual({});
  });

  it('should give nothing and forget the inputs when they belong to someone else (shared device)', () => {
    const store = new FakeDecisionInputStore();
    store.kept = {
      owner: 'paul@example.org',
      decisions: { [throneByAlice.id]: { kind: 'rejection', reason } },
    };

    expect(restoreDecisionInputs(store, bruno)).toEqual({});
    expect(store.kept).toBeNull();
  });
});

describe('acceptProposal', () => {
  it('should send no adjustment and no note, and tell the pose is published, when accepting as proposed', async () => {
    const { gateway, store } = setUp();
    gateway.acceptance = ok({ name: 'Throne', adjusted: false });

    const result = await acceptProposal(gateway, store, throneByAlice, null, bruno);

    expect(gateway.accepted).toEqual([
      { id: throneByAlice.id, kind: 'pose-proposal', acceptance: { adjustments: [], note: null } },
    ]);
    expect(result).toEqual(ok({ name: 'Throne', adjusted: false }));
  });

  it('should send the adjusted values only and the note without superfluous spaces when accepting with adjustments', async () => {
    const { gateway, store } = setUp();
    const input = { ...throneByAlice.pose, flyerDifficulty: 'beginner' } as const;

    await acceptProposal(gateway, store, throneByAlice, { input, note: '  Côté flyer,   débutant. ' }, bruno);

    expect(gateway.accepted).toEqual([
      {
        id: throneByAlice.id,
        kind: 'pose-proposal',
        acceptance: {
          adjustments: [{ field: 'flyerDifficulty', proposed: 'discovery', retained: 'beginner' }],
          note: 'Côté flyer, débutant.',
        },
      },
    ]);
  });

  it('should send nothing and report the field errors when a retained value breaks a rule of a pose', async () => {
    const { gateway, store } = setUp();
    const input = { ...throneByAlice.pose, name: '' };

    const result = await acceptProposal(gateway, store, throneByAlice, { input, note: '' }, bruno);

    expect(result).toEqual(
      fail({ kind: 'invalid-input', errors: [{ field: 'name', code: 'pose.name-required' }] }),
    );
    expect(gateway.accepted).toEqual([]);
  });

  it('should send nothing and report the note as too long when it has 501 characters', async () => {
    const { gateway, store } = setUp();
    const input = { ...throneByAlice.pose, flyerDifficulty: 'beginner' } as const;

    const result = await acceptProposal(
      gateway,
      store,
      throneByAlice,
      { input, note: 'x'.repeat(501) },
      bruno,
    );

    expect(result).toEqual(fail({ kind: 'invalid-note', code: 'contribution.adjustment-note-too-long' }));
    expect(gateway.accepted).toEqual([]);
  });

  it('should accept as proposed, without the note, when no retained value differs from the proposed one', async () => {
    const { gateway, store } = setUp();

    await acceptProposal(
      gateway,
      store,
      throneByAlice,
      { input: throneByAlice.pose, note: 'Belle proposition.' },
      bruno,
    );

    expect(gateway.accepted).toEqual([
      { id: throneByAlice.id, kind: 'pose-proposal', acceptance: { adjustments: [], note: null } },
    ]);
  });

  it.each(['unauthenticated', 'unreachable', 'outdated'] as const)(
    'should keep the adjustments and the note as typed, for their owner and their proposal, when the API answers "%s"',
    async (failure) => {
      const { gateway, store } = setUp();
      gateway.acceptance = fail({ kind: failure });
      const input = { ...throneByAlice.pose, flyerDifficulty: 'beginner' } as const;

      await acceptProposal(gateway, store, throneByAlice, { input, note: 'Côté flyer, débutant.' }, bruno);

      expect(store.kept).toEqual({
        owner: bruno,
        decisions: { [throneByAlice.id]: { kind: 'acceptance', input, note: 'Côté flyer, débutant.' } },
      });
    },
  );

  it('should forget the kept input of this proposal when the acceptance is received', async () => {
    const { gateway, store } = setUp();
    store.kept = {
      owner: bruno,
      decisions: { [throneByAlice.id]: { kind: 'acceptance', input: throneByAlice.pose, note: '' } },
    };

    await acceptProposal(gateway, store, throneByAlice, null, bruno);

    expect(store.kept).toEqual({ owner: bruno, decisions: {} });
  });

  it.each([
    ['name-already-in-catalog', 'name-already-in-catalog'],
    ['name-already-pending', 'name-already-pending'],
    ['already-decided', 'already-decided'],
    ['not-found', 'not-found'],
    ['unauthenticated', 'session-expired'],
    ['forbidden', 'role-withdrawn'],
    ['unreachable', 'unreachable'],
    ['outdated', 'outdated'],
  ] as const)('should report "%s" from the API as "%s"', async (failure, error) => {
    const { gateway, store } = setUp();
    gateway.acceptance = fail({ kind: failure });

    expect(await acceptProposal(gateway, store, throneByAlice, null, bruno)).toEqual(fail({ kind: error }));
  });

  describe('of a revision (story 6)', () => {
    it('should send no adjustment when accepting the revision as proposed', async () => {
      const { gateway, store } = setUp();

      await acceptProposal(gateway, store, revisionOfBird, null, bruno);

      expect(gateway.accepted).toEqual([
        { id: revisionOfBird.id, kind: 'pose-revision', acceptance: { adjustments: [], note: null } },
      ]);
    });

    it('should adjust the revised pose: the proposed value of a field is the one of the revision, or the current one', async () => {
      const { gateway, store } = setUp();
      const input = {
        ...revisionOfBird.pose,
        flyerDifficulty: 'beginner',
        baseDifficulty: 'beginner',
      } as const;

      await acceptProposal(gateway, store, revisionOfBird, { input, note: '' }, bruno);

      expect(gateway.accepted[0]?.acceptance.adjustments).toEqual([
        { field: 'baseDifficulty', proposed: 'discovery', retained: 'beginner' },
        { field: 'flyerDifficulty', proposed: 'discovery', retained: 'beginner' },
      ]);
    });

    it('should send nothing and report it when the retained revision would leave the pose as it is', async () => {
      const { gateway, store } = setUp();

      const result = await acceptProposal(
        gateway,
        store,
        revisionOfBird,
        { input: revisionOfBird.pose, note: '' },
        bruno,
      );

      expect(result).toEqual(fail({ kind: 'retained-revision-changes-nothing' }));
      expect(gateway.accepted).toEqual([]);
    });

    it.each(['retained-revision-changes-nothing', 'pose-changed'] as const)(
      'should report "%s" from the API as such',
      async (failure) => {
        const { gateway, store } = setUp();
        gateway.acceptance = fail({ kind: failure });

        expect(await acceptProposal(gateway, store, revisionOfBird, null, bruno)).toEqual(
          fail({ kind: failure }),
        );
      },
    );
  });
});
