import { describe, expect, it } from 'vitest';
import { fail, ok } from '../../domain/common/result';
import type { PoseTaggingFailure, PoseTaggingGateway } from './PoseTaggingGateway';
import { tagPose, type TagPoseError } from './tag-pose';

// Story 9a « Étiqueter les poses »: a validator or an administrator tags a published pose from its page (ADR 0036).

const answering = (answer: Awaited<ReturnType<PoseTaggingGateway['tagPose']>>) => {
  const sent: Array<{ poseId: string; tagIds: readonly string[] }> = [];
  const gateway: PoseTaggingGateway = {
    tagPose: async (poseId, tagIds) => {
      sent.push({ poseId, tagIds });
      return answer;
    },
  };
  return { gateway, sent };
};

describe('tagPose', () => {
  it('should send the chosen tags of the pose, replacing its tags', async () => {
    const { gateway, sent } = answering(ok(undefined));

    expect(await tagPose(gateway, 'pose-1', ['tag-lunaire'])).toEqual(ok(undefined));
    expect(sent).toEqual([{ poseId: 'pose-1', tagIds: ['tag-lunaire'] }]);
  });

  it.each<[PoseTaggingFailure, TagPoseError]>([
    [{ kind: 'unauthenticated' }, { kind: 'session-expired' }],
    [{ kind: 'forbidden' }, { kind: 'role-withdrawn' }],
    [{ kind: 'unreachable' }, { kind: 'unreachable' }],
    [{ kind: 'outdated' }, { kind: 'outdated' }],
    [{ kind: 'not-found' }, { kind: 'not-found' }],
    [{ kind: 'revision-pending' }, { kind: 'revision-pending' }],
    [
      { kind: 'tags-not-in-list', tagIds: ['t'] },
      { kind: 'tags-not-in-list', tagIds: ['t'] },
    ],
    [
      { kind: 'tags-not-applicable', tagIds: ['t'] },
      { kind: 'tags-not-applicable', tagIds: ['t'] },
    ],
  ])('should tell why the tags were not recorded (%j)', async (failure, error) => {
    expect(await tagPose(answering(fail(failure)).gateway, 'pose-1', [])).toEqual(fail(error));
  });
});
