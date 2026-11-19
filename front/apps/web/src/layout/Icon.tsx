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
  | 'chevronDown'
  | 'rise'
  | 'set'
  | 'spot'
  | 'trajectory'
  | 'loop'
  | 'burst'
  | 'station';

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
  // « Peut commencer un flow »: a sunrise (principes.md, « Bornes de flow »).
  rise: (
    <>
      <path d="M4 14a6 6 0 0 1 12 0" fill="none" {...line} strokeWidth="1.8" />
      <path d="M2 17h16" {...line} strokeWidth="1.8" />
      <path d="M10 2v5M7.5 4.5 10 2l2.5 2.5" fill="none" {...line} strokeWidth="1.8" strokeLinejoin="round" />
    </>
  ),
  // « Peut terminer un flow »: a sunset.
  set: (
    <>
      <path d="M4 14a6 6 0 0 1 12 0" fill="none" {...line} strokeWidth="1.8" />
      <path d="M2 17h16" {...line} strokeWidth="1.8" />
      <path d="M10 2v5M7.5 4.5 10 7l2.5-2.5" fill="none" {...line} strokeWidth="1.8" strokeLinejoin="round" />
    </>
  ),
  // A pose in the middle of a flow (fil-du-flow.md, story 9): a station, a ring and its centre.
  station: (
    <>
      <circle cx="10" cy="10" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="10" cy="10" r="2.5" fill="currentColor" />
    </>
  ),
  // The safety note of the pose page (« spotter »).
  spot: (
    <>
      <circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M10 6v5" {...line} />
      <circle cx="10" cy="14" r="1.2" fill="currentColor" />
    </>
  ),
  // A transition is a flight: a dotted trajectory (element-transition.md), 46 × 20.
  trajectory: (
    <>
      <path d="M3 17C12 2 32 2 41 15" fill="none" {...line} strokeDasharray="1 4.5" />
      <path d="M36 14.5l5 1 .5-5" fill="none" {...line} strokeLinejoin="round" />
    </>
  ),
  // A washing machine: the trajectory loops back to the same pose, 46 × 20.
  loop: (
    <>
      <path d="M8 15c-6-2-5-12 3-12s14 10 24 10c6 0 7-8 1-9" fill="none" {...line} strokeDasharray="1 4.5" />
      <path d="M33.5 1.5 37 4l-3 3" fill="none" {...line} strokeLinejoin="round" />
    </>
  ),
  // The sun bursting over a success panel (panneau-succes.md), 54 × 54, decorative.
  burst: (
    <>
      <circle cx="27" cy="27" r="10" fill="currentColor" />
      <path
        d="M27 4v7M27 43v7M4 27h7M43 27h7M10.7 10.7l5 5M38.3 38.3l5 5M10.7 43.3l5-5M38.3 15.7l5-5"
        {...line}
        strokeWidth="3"
      />
    </>
  ),
  plus: (
    <>
      <line x1="10" y1="4" x2="10" y2="16" {...line} />
      <line x1="4" y1="10" x2="16" y2="10" {...line} />
    </>
  ),
};

/** The icons that are not drawn on the 20 × 20 grid. */
const viewBoxes: Partial<Record<IconName, string>> = {
  trajectory: '0 0 46 20',
  loop: '0 0 46 20',
  burst: '0 0 54 54',
};

const wide: Partial<Record<IconName, string>> = {
  trajectory: ' icon--trajectory',
  loop: ' icon--trajectory',
  burst: ' icon--burst',
};

/** Decorative icons drawn in the repository (docs/design/principes.md, « Icônes »): currentColor, hidden from assistive tech. */
export function Icon({ name }: { readonly name: IconName }) {
  return (
    <svg
      className={`icon${wide[name] ?? ''}`}
      viewBox={viewBoxes[name] ?? '0 0 20 20'}
      aria-hidden="true"
      focusable="false"
    >
      {shapes[name]}
    </svg>
  );
}
