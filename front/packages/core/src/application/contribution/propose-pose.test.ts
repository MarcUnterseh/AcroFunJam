import { describe, expect, it } from 'vitest';
import { fail, ok, type Result } from '../../domain/common/result';
import type { PoseProposalInput, ValidPoseProposal } from '../../domain/contribution/pose-proposal';
import type { ContributionGateway, ProposalFailure, ProposalOutcome } from './ContributionGateway';
import { keepProposalInput, proposePose, restoreProposalInput } from './propose-pose';
import type { KeptProposalInput, ProposalInputStore } from './ProposalInputStorePort';

class FakeGateway implements ContributionGateway {
  sent: ValidPoseProposal[] = [];
  answer: Result<ProposalOutcome, ProposalFailure> = ok({ status: 'pending', name: 'Throne' });

  async proposePose(proposal: ValidPoseProposal) {
    this.sent.push(proposal);
    return this.answer;
  }
}

class FakeStore implements ProposalInputStore {
  kept: KeptProposalInput | null = null;
  load = () => this.kept;
  save = (kept: KeptProposalInput) => {
    this.kept = kept;
  };
  clear = () => {
    this.kept = null;
  };
}

const alice = 'alice@example.org';

const throne: PoseProposalInput = {
  name: ' Throne ',
  baseDifficulty: 'beginner',
  flyerDifficulty: 'discovery',
  canStartFlow: true,
  canEndFlow: true,
};

const setUp = () => ({ gateway: new FakeGateway(), store: new FakeStore() });

describe('proposePose', () => {
  it('should send nothing and report every field error when the input is invalid', async () => {
    const { gateway, store } = setUp();

    const result = await proposePose(gateway, store, { ...throne, name: '', canEndFlow: null }, alice);

    expect(result).toEqual(
      fail({
        kind: 'invalid-input',
        errors: [
          { field: 'name', code: 'pose.name-required' },
          { field: 'canEndFlow', code: 'pose.can-end-flow-required' },
        ],
      }),
    );
    expect(gateway.sent).toEqual([]);
  });

  it('should send the normalised proposal and tell it is pending when the API puts it pending', async () => {
    const { gateway, store } = setUp();

    const result = await proposePose(gateway, store, throne, alice);

    expect(gateway.sent).toEqual([{ ...throne, name: 'Throne' }]);
    expect(result).toEqual(ok({ status: 'pending', name: 'Throne' }));
  });

  it.each(['published', 'received'] as const)(
    'should pass on the outcome "%s" given by the API',
    async (status) => {
      const { gateway, store } = setUp();
      gateway.answer = ok({ status, name: 'Throne' });

      expect(await proposePose(gateway, store, throne, alice)).toEqual(ok({ status, name: 'Throne' }));
    },
  );

  it('should forget the kept input when the proposal is received', async () => {
    const { gateway, store } = setUp();
    store.kept = { owner: alice, input: throne };

    await proposePose(gateway, store, throne, alice);

    expect(store.kept).toBeNull();
  });

  it.each(['name-already-in-catalog', 'name-already-pending'] as const)(
    'should report the refusal of the name when the API answers %s',
    async (kind) => {
      const { gateway, store } = setUp();
      gateway.answer = fail({ kind });

      expect(await proposePose(gateway, store, throne, alice)).toEqual(fail({ kind }));
    },
  );

  it('should report the field errors of the API when the API finds the content invalid', async () => {
    const { gateway, store } = setUp();
    const errors = [{ field: 'name', code: 'pose.name-too-long' }] as const;
    gateway.answer = fail({ kind: 'invalid-content', errors });

    expect(await proposePose(gateway, store, throne, alice)).toEqual(fail({ kind: 'invalid-input', errors }));
  });

  it('should report an expired session and keep the input, with its owner, when the API no longer knows the person', async () => {
    const { gateway, store } = setUp();
    gateway.answer = fail({ kind: 'unauthenticated' });

    const result = await proposePose(gateway, store, throne, alice);

    expect(result).toEqual(fail({ kind: 'session-expired' }));
    expect(store.kept).toEqual({ owner: alice, input: throne });
  });

  it.each(['unreachable', 'outdated'] as const)(
    'should report the failure "%s" and keep the input, with its owner',
    async (kind) => {
      const { gateway, store } = setUp();
      gateway.answer = fail({ kind });

      const result = await proposePose(gateway, store, throne, alice);

      expect(result).toEqual(fail({ kind }));
      expect(store.kept).toEqual({ owner: alice, input: throne });
    },
  );
});

describe('keepProposalInput', () => {
  it('should keep the input with its owner when the session expired while typing', () => {
    const store = new FakeStore();

    keepProposalInput(store, throne, alice);

    expect(store.kept).toEqual({ owner: alice, input: throne });
  });
});

describe('restoreProposalInput', () => {
  it('should give the kept input once, then forget it, when it belongs to the signed-in person', () => {
    const store = new FakeStore();
    store.kept = { owner: alice, input: throne };

    expect(restoreProposalInput(store, alice)).toEqual(throne);
    expect(restoreProposalInput(store, alice)).toBeNull();
  });

  it('should give nothing and forget the input when it belongs to someone else (shared device)', () => {
    const store = new FakeStore();
    store.kept = { owner: 'bruno@example.org', input: throne };

    expect(restoreProposalInput(store, alice)).toBeNull();
    expect(store.kept).toBeNull();
  });

  it('should give nothing when no input was kept', () => {
    expect(restoreProposalInput(new FakeStore(), alice)).toBeNull();
  });
});
