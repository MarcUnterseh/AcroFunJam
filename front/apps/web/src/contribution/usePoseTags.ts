import { listPoseTags, type ChoosableTag } from '@acrofunjam/core';
import { useQuery } from '@tanstack/react-query';
import { useContribution } from './ContributionContext';

/** Cache key of the tags offered in the forms of a pose (Contribution reads the list through its own port). */
export const poseTagsKey = ['contribution', 'pose-tags'] as const;

/**
 * Story 9a: the tags of the list that apply to poses, offered in the forms « Proposer une pose » and « Proposer une
 * modification »; undefined while they are read, or when they could not be (the form then offers no tag).
 */
export function usePoseTags(): readonly ChoosableTag[] | undefined {
  const { gateway } = useContribution();
  const { data } = useQuery({
    queryKey: poseTagsKey,
    queryFn: async () => {
      const result = await listPoseTags(gateway);
      if (!result.ok) throw new Error(result.error.kind);
      return result.value;
    },
    retry: false,
    networkMode: 'always',
  });
  return data;
}
