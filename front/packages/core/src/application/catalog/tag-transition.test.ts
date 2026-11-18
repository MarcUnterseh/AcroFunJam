import { describe, expect, it } from 'vitest';
import { fail, ok } from '../../domain/common/result';
import { tagTransition, type TagTransitionError } from './tag-transition';
import type { TagTransitionFailure, TransitionTaggingGateway } from './TransitionTaggingGateway';

// Story 8 « Étiquettes »: a validator or an administrator tags a published transition from the page of a pose.

const answering = (answer: Awaited<ReturnType<TransitionTaggingGateway['tagTransition']>>) => {
  const sent: Array<{ transitionId: string; tagIds: readonly string[] }> = [];
  const gateway: TransitionTaggingGateway = {
    tagTransition: async (transitionId, tagIds) => {
      sent.push({ transitionId, tagIds });
      return answer;
    },
  };
  return { gateway, sent };
};

describe('tagTransition', () => {
  it('should send the chosen tags of the transition, replacing its tags', async () => {
    const { gateway, sent } = answering(ok(undefined));

    const result = await tagTransition(gateway, 'transition-1', ['tag-dynamique', 'tag-pop']);

    expect(result).toEqual(ok(undefined));
    expect(sent).toEqual([{ transitionId: 'transition-1', tagIds: ['tag-dynamique', 'tag-pop'] }]);
  });

  it('should send no tag to remove them all', async () => {
    const { gateway, sent } = answering(ok(undefined));

    await tagTransition(gateway, 'transition-1', []);

    expect(sent).toEqual([{ transitionId: 'transition-1', tagIds: [] }]);
  });

  it.each<[TagTransitionFailure, TagTransitionError]>([
    [{ kind: 'unauthenticated' }, { kind: 'session-expired' }],
    [{ kind: 'forbidden' }, { kind: 'role-withdrawn' }],
    [{ kind: 'unreachable' }, { kind: 'unreachable' }],
    [{ kind: 'outdated' }, { kind: 'outdated' }],
    [{ kind: 'not-found' }, { kind: 'not-found' }],
    [
      { kind: 'tags-not-in-list', tagIds: ['tag-vrille'] },
      { kind: 'tags-not-in-list', tagIds: ['tag-vrille'] },
    ],
  ])('should tell why the tags were not recorded (%o)', async (failure, error) => {
    const { gateway } = answering(fail(failure));

    expect(await tagTransition(gateway, 'transition-1', ['tag-vrille'])).toEqual(fail(error));
  });
});
