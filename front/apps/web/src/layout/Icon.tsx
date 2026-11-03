/** Decorative icons drawn in the repository (docs/design/principes.md, « Icônes »): currentColor, hidden from assistive tech. */
export function Icon({ name }: { readonly name: 'error' | 'info' }) {
  return (
    <svg className="icon" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <circle cx="10" cy="10" r="8.5" fill="none" stroke="currentColor" strokeWidth="2" />
      {name === 'error' ? (
        <>
          <line
            x1="10"
            y1="5.5"
            x2="10"
            y2="11"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle cx="10" cy="14.5" r="1.2" fill="currentColor" />
        </>
      ) : (
        <>
          <circle cx="10" cy="5.8" r="1.2" fill="currentColor" />
          <line
            x1="10"
            y1="9"
            x2="10"
            y2="14.5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </>
      )}
    </svg>
  );
}
