import { catalogLabels, difficultyLevelName, difficultyScale } from '@acrofunjam/core';
import { useId } from 'react';
import { DifficultyDots } from './DifficultyDots';

/**
 * Legend of the difficulty scale, then the responsibility warning (docs/design/composants/legende-echelle.md).
 * The ordered list carries the order: no "<" between the levels. The page of a pose gives its own warning, about
 * the transitions (« Variante page d'une pose », story 7).
 */
export function DifficultyLegend({
  warning = catalogLabels.responsibilityWarning,
}: { readonly warning?: string } = {}) {
  const introduction = useId();
  return (
    <div className="difficulty-legend">
      <span id={introduction} className="difficulty-legend__introduction">
        {catalogLabels.scaleIntroduction}
      </span>{' '}
      {/* role="list" restores the list semantics that some browsers drop with "list-style: none". */}
      <ol className="difficulty-legend__levels" role="list" aria-labelledby={introduction}>
        {difficultyScale.map((level) => (
          <li key={level} className="difficulty-legend__level">
            <DifficultyDots level={level} />
            {difficultyLevelName(level)}
          </li>
        ))}
      </ol>
      <p className="difficulty-legend__warning">{warning}</p>
    </div>
  );
}
