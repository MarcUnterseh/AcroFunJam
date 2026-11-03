import { catalogLabels, difficultyLevelName, difficultyScale } from '@acrofunjam/core';
import { useId } from 'react';
import { DifficultyDots } from './DifficultyDots';

/**
 * Legend of the difficulty scale, then the responsibility warning (docs/design/composants/legende-echelle.md).
 * The ordered list carries the order: no "<" between the levels.
 */
export function DifficultyLegend() {
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
      <p className="difficulty-legend__warning">{catalogLabels.responsibilityWarning}</p>
    </div>
  );
}
