import { listTags, type Tag, type TagListFailure } from '@acrofunjam/core';
import { useQuery } from '@tanstack/react-query';
import { useTagListGateway } from './TagListContext';

/** The list could not be read: carries the failure of the use case. */
export class TagListLoadingFailed extends Error {
  readonly failure: TagListFailure;

  constructor(failure: TagListFailure) {
    super(failure.kind);
    this.failure = failure;
    this.name = 'TagListLoadingFailed';
  }
}

/** Cache key of the list of tags, under the catalog. */
export const tagListKey = ['catalog', 'tags'] as const;

/** The tags of the list (story 8), through the listTags use case of @acrofunjam/core. */
export function useTags() {
  const gateway = useTagListGateway();
  return useQuery<readonly Tag[], TagListLoadingFailed>({
    queryKey: tagListKey,
    queryFn: async () => {
      const result = await listTags(gateway);
      if (!result.ok) throw new TagListLoadingFailed(result.error);
      return result.value;
    },
    // As the catalog: the failure is shown at once with « Réessayer », even when the browser believes it is offline.
    retry: false,
    networkMode: 'always',
  });
}
