import { listTransitionTags, type ChoosableTag } from '@acrofunjam/core';
import { useQuery } from '@tanstack/react-query';
import { useValidation } from './ValidationContext';

/** Cache key of the list of tags read by the validation queue (Contribution reads it through its own port). */
export const transitionTagsKey = ['contribution', 'tags'] as const;

/**
 * The tags of the list (story 8), offered in the adjustment zone of a transition, through the listTransitionTags use
 * case of @acrofunjam/core; undefined while it is read, or when it could not be (the zone then offers no tag to change).
 */
export function useTransitionTags(): readonly ChoosableTag[] | undefined {
  const { gateway } = useValidation();
  const { data } = useQuery({
    queryKey: transitionTagsKey,
    queryFn: async () => {
      const result = await listTransitionTags(gateway);
      if (!result.ok) throw new Error(result.error.kind);
      return result.value;
    },
    retry: false,
    networkMode: 'always',
  });
  return data;
}
