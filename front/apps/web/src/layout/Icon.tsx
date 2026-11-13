type IconName =
  | 'error'
  | 'info'
  | 'check'
  | 'dash'
  | 'plus'
  | 'success'
  | 'arrow'
  | 'clock'
  | 'chevronLeft'
  | 'chevronDown';

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
  // Right arrow of the summary « proposé → retenu » (recapitulatif-ajustements.md).
  arrow: (
    <>
      <line x1="3" y1="10" x2="16" y2="10" {...line} />
      <polyline points="11,5 16,10 11,15" fill="none" {...line} strokeLinejoin="round" />
    </>
  ),
  // A pending proposal (statut-proposition.md): same dial as « error » and « info », hands at 12 and 4.
  clock: (
    <>
      <circle cx="10" cy="10" r="8.5" fill="none" stroke="currentColor" strokeWidth="2" />
      <polyline points="10,5.5 10,10 13.5,12" fill="none" {...line} strokeLinejoin="round" />
    </>
  ),
  // Link back to the parent page (lien-retour.md, story 7).
  chevronLeft: <polyline points="12.5,4.5 7,10 12.5,15.5" fill="none" {...line} strokeLinejoin="round" />,
  // Drop-down list (champ.md, « Variante liste déroulante », story 7).
  chevronDown: <polyline points="4.5,7.5 10,13 15.5,7.5" fill="none" {...line} strokeLinejoin="round" />,
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
