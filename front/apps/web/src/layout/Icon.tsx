type IconName = 'error' | 'info' | 'check' | 'dash' | 'plus' | 'success';

const line = { stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' } as const;

const shapes: Record<IconName, React.ReactNode> = {
  error: (
    <>
      <circle cx="10" cy="10" r="8.5" fill="none" stroke="currentColor" strokeWidth="2" />
      <line x1="10" y1="5.5" x2="10" y2="11" {...line} />
      <circle cx="10" cy="14.5" r="1.2" fill="currentColor" />
    </>
  ),
  info: (
    <>
      <circle cx="10" cy="10" r="8.5" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="10" cy="5.8" r="1.2" fill="currentColor" />
      <line x1="10" y1="9" x2="10" y2="14.5" {...line} />
    </>
  ),
  check: <polyline points="4,10.5 8.5,15 16,5.5" fill="none" {...line} strokeLinejoin="round" />,
  // Heading a success panel (docs/design/composants/panneau-succes.md): circle and tick.
  success: (
    <>
      <circle cx="10" cy="10" r="8.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <polyline
        points="6,10.5 8.8,13.2 14,7"
        fill="none"
        {...line}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </>
  ),
  dash: <line x1="5" y1="10" x2="15" y2="10" {...line} />,
  plus: (
    <>
      <line x1="10" y1="4" x2="10" y2="16" {...line} />
      <line x1="4" y1="10" x2="16" y2="10" {...line} />
    </>
  ),
};

/** Decorative icons drawn in the repository (docs/design/principes.md, « Icônes »): currentColor, hidden from assistive tech. */
export function Icon({ name }: { readonly name: IconName }) {
  return (
    <svg className="icon" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      {shapes[name]}
    </svg>
  );
}
