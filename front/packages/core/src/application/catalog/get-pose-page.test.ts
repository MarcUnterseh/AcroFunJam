import { describe, expect, it } from 'vitest';
import { fail, ok } from '../../domain/common/result';
import type { PosePage } from '../../domain/catalog/pose-page';
import { getPosePage } from './get-pose-page';
import type { PosePageFailure, PosePageGateway } from './PosePageGateway';

const throne: PosePage = {
  id: 'pose-throne',
  name: 'Throne',
  baseDifficulty: 'beginner',
  flyerDifficulty: 'discovery',
  canStartFlow: true,
  canEndFlow: true,
  transitionsFrom: [],
  transitionsTo: [],
};

const answering = (answer: Awaited<ReturnType<PosePageGateway['getPosePage']>>) => {
  const read: string[] = [];
  const gateway: PosePageGateway = {
    getPosePage: async (poseId) => {
      read.push(poseId);
      return answer;
    },
  };
  return { gateway, read };
};

describe('getPosePage', () => {
  it('should give the page of the published pose asked for', async () => {
    const { gateway, read } = answering(ok(throne));

    const result = await getPosePage(gateway, 'pose-throne');

    expect(result).toEqual(ok(throne));
    expect(read).toEqual(['pose-throne']);
  });

  it.each<PosePageFailure>([{ kind: 'not-found' }, { kind: 'unreachable' }, { kind: 'outdated' }])(
    'should tell why the page cannot be shown when the catalog answers $kind',
    async (failure) => {
      const { gateway } = answering(fail(failure));

      expect(await getPosePage(gateway, 'pose-throne')).toEqual(fail(failure));
    },
  );
});
