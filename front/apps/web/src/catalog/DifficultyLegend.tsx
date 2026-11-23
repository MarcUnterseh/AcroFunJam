import { catalogLabels, difficultyLevelName, difficultyScale } from '@acrofunjam/core';
import { useId } from 'react';
import { Icon } from '../layout/Icon';
import { DifficultyMoon } from './DifficultyMoon';

/**
 * Legend of the difficulty scale, then the responsibility warning (docs/design/composants/legende-echelle.md).
 * The ordered list carries the order: no "<" between the levels. The page of a pose gives its own warning, about
 * the transitions (« Variante page d'une pose », story 7).
 */
export function DifficultyLegend({
  warning = catalogLabels.responsibilityWarning,
  safetyNote = false,
}: {
  /** null: no warning (story 10: the safety note is in the section of the main photo). */
  readonly warning?: string | null;
  /** The page of a pose: the warning becomes the safety note (« spotter »), on the sun surface with its icon. */
  readonly safetyNote?: boolean;
} = {}) {
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
            <DifficultyMoon level={level} />
            {difficultyLevelName(level)}
          </li>
        ))}
      </ol>
      {warning === null ? null : safetyNote ? (
        <p className="safety-note">
          <Icon name="spot" />
          <span>{warning}</span>
        </p>
      ) : (
        <p className="difficulty-legend__warning">{warning}</p>
      )}
    </div>
  );
}
