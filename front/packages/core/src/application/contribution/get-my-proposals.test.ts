import { describe, expect, it } from 'vitest';
import { fail, ok, type Result } from '../../domain/common/result';
import type { MyProposal } from '../../domain/contribution/my-pose-proposal';
import type { PoseName } from '../../domain/shared-kernel/pose-name';
import type { ContributionGateway, MyProposalsFailure } from './ContributionGateway';
import { getMyProposals } from './get-my-proposals';

class FakeGateway implements ContributionGateway {
  myProposals: Result<readonly MyProposal[], MyProposalsFailure> = ok([]);

  async proposePose(): Promise<never> {
    throw new Error('Not expected in these tests');
  }

  async getMyProposals() {
    return this.myProposals;
  }
}

const proposal = (name: string, submittedAt: string): MyProposal => ({
  id: `proposal-${name}`,
  pose: {
    name: name as PoseName,
    baseDifficulty: 'beginner',
    flyerDifficulty: 'discovery',
    canStartFlow: true,
    canEndFlow: true,
  },
  submittedAt: new Date(submittedAt),
  status: { kind: 'pending' },
});

describe('getMyProposals', () => {
  it('should give the proposals of the requester as the API orders them, the most recent first', async () => {
    const gateway = new FakeGateway();
    const proposals = [proposal('Throne', '2026-11-03T09:00:00Z'), proposal('Star', '2026-11-01T09:00:00Z')];
    gateway.myProposals = ok(proposals);

    expect(await getMyProposals(gateway)).toEqual(ok(proposals));
  });

  it.each([
    ['unauthenticated', 'session-expired'],
    ['unreachable', 'unreachable'],
    ['outdated', 'outdated'],
  ] as const)('should report "%s" from the API as "%s"', async (failure, error) => {
    const gateway = new FakeGateway();
    gateway.myProposals = fail({ kind: failure });

    expect(await getMyProposals(gateway)).toEqual(fail({ kind: error }));
  });
});
