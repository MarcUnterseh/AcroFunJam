/** The mark (docs/design/composants/en-tete.md): the base, a half-circle of earth, carries the flyer, a sun. Decorative. */
export function Logo() {
  return (
    <svg className="logo" viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <path className="logo__earth" d="M3 27a13 13 0 0 1 26 0z" />
      <circle className="logo__sun" cx="16" cy="8.5" r="6" />
    </svg>
  );
}
