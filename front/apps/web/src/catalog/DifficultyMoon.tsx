import { difficultyRank, type DifficultyLevel } from '@acrofunjam/core';

/** The four phases of the lunar scale, from the most accessible level to the most demanding. */
const phases = ['crescent', 'half', 'gibbous', 'full'] as const;

/** The lit part of each phase, drawn inside a ring (viewBox 20 × 20). The full moon fills the ring. */
const litParts: Record<(typeof phases)[number], string | null> = {
  crescent: 'M10 2a8 8 0 0 1 0 16a4.5 8 0 0 0 0-16z',
  half: 'M10 2a8 8 0 0 1 0 16z',
  gibbous: 'M10 2a8 8 0 0 1 0 16a4.5 8 0 0 1 0-16z',
  full: null,
};

/**
 * A moon phase of the difficulty scale (docs/design/composants/legende-echelle.md): croissant = Découverte,
 * demi-lune = Débutant, gibbeuse = Intermédiaire, pleine lune = Avancé. Decorative: the level is always written
 * next to it.
 */
export function DifficultyMoon({ level }: { readonly level: DifficultyLevel }) {
  const phase = phases[difficultyRank(level) - 1] ?? 'crescent';
  const lit = litParts[phase];
  return (
    <svg className="moon" data-phase={phase} viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <circle
        cx="10"
        cy="10"
        r="8"
        fill={lit ? 'none' : 'currentColor'}
        stroke="currentColor"
        strokeWidth="1.5"
      />
      {lit && <path d={lit} fill="currentColor" />}
    </svg>
  );
}
