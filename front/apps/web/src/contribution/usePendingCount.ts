import { countPendingProposals } from '@acrofunjam/core';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useValidation } from './ValidationContext';

/** Cache key of the number of proposals pending validation (header of the site). */
const pendingCountKey = ['contribution', 'pending-count'] as const;

/**
 * Number of proposals pending validation, null while unknown (loading, failure): read for a validator only,
 * again after each navigation (ValidationNav).
 */
export function usePendingCount(enabled: boolean) {
  const { gateway } = useValidation();
  const { data } = useQuery({
    queryKey: pendingCountKey,
    queryFn: async () => {
      const count = await countPendingProposals(gateway);
      return count.ok ? count.value : null;
    },
    enabled,
    networkMode: 'always',
  });
  return enabled ? (data ?? null) : null;
}

/** Reads the number again, or takes one off it locally after a decision (no request, no live region). */
export function usePendingCountUpdates() {
  const queryClient = useQueryClient();
  return {
    reread: useCallback(
      () => void queryClient.invalidateQueries({ queryKey: pendingCountKey }),
      [queryClient],
    ),
    decided: useCallback(
      () => queryClient.setQueryData<number | null>(pendingCountKey, (count) => (count ? count - 1 : count)),
      [queryClient],
    ),
  };
}
