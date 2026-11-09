import { useLayoutEffect } from 'react';

/** While the session is checked, main is busy: only the title is shown, never the content (not even briefly). */
export function useBusyMain(busy: boolean) {
  useLayoutEffect(() => {
    const main = document.querySelector('main');
    if (!busy || !main) return;
    main.setAttribute('aria-busy', 'true');
    return () => main.removeAttribute('aria-busy');
  }, [busy]);
}
