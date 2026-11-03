/** Gives the focus to the title of the page (h1 with tabIndex=-1), so that screen readers announce it. */
export const focusPageTitle = () => document.querySelector<HTMLElement>('main h1')?.focus();
