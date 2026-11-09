import { useCallback } from 'react';
import { useAnnounce } from '../layout/Announcer';

/** A counter under a field (champ.md): what it says for a length, null while far from the limit; and the limit. */
export type CounterPolicy = {
  readonly labelOf: (length: number) => string | null;
  readonly maxLength: number;
};

type Stage = 'far' | 'near' | 'over';

const stageOf = ({ labelOf, maxLength }: CounterPolicy, length: number): Stage =>
  length > maxLength ? 'over' : labelOf(length) ? 'near' : 'far';

/**
 * Announces a counter by stages (story 3, champ.md): when it appears, when the limit is passed, and when back under
 * it; never on each keystroke, and the counter itself has no live region. Called by the field on each change.
 */
export function useCounterAnnouncement(policy: CounterPolicy) {
  const announce = useAnnounce();
  return useCallback(
    (lengthBefore: number, lengthAfter: number) => {
      const after = stageOf(policy, lengthAfter);
      if (after !== 'far' && after !== stageOf(policy, lengthBefore))
        announce(policy.labelOf(lengthAfter) ?? '');
    },
    [policy, announce],
  );
}
