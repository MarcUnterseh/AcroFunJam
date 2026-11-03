import { difficultyRank, difficultyScale, type DifficultyLevel } from '@acrofunjam/core';

/** Decorative dot scale (docs/design/composants/legende-echelle.md): the level is always written next to it. */
export function DifficultyDots({ level }: { readonly level: DifficultyLevel }) {
  const rank = difficultyRank(level);
  return (
    <span className="difficulty-dots" aria-hidden="true">
      {difficultyScale.map((step, index) => (
        <span
          key={step}
          className={`difficulty-dots__dot${index < rank ? ' difficulty-dots__dot--filled' : ''}`}
        />
      ))}
    </span>
  );
}
