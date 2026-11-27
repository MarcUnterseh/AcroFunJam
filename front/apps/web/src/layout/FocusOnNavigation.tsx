import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router';
import { focusPageTitle } from './focus';

/**
 * After each navigation (not on the first display), the focus goes to the new page's title; unless the address names a
 * part of the page that takes it (story 12: back on a transition after adding a video, UX-57). A change of the anchor
 * alone is not a navigation: the focus stays where it is.
 */
export function FocusOnNavigation() {
  const { pathname, hash } = useLocation();
  const shownPath = useRef<string | null>(null);
  useEffect(() => {
    const previous = shownPath.current;
    shownPath.current = pathname;
    if (previous === null || previous === pathname) return;
    // The anchor read with the path it came with: the part it names is rendered by now when the page is loaded.
    if (hash && document.getElementById(decodeURIComponent(hash.slice(1)))) return;
    focusPageTitle();
  }, [pathname, hash]);
  return null;
}
