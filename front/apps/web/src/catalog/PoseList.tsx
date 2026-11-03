import {
  catalogLabels,
  difficultyLevelName,
  flowBoundaryAnswer,
  type DifficultyLevel,
  type PoseSummary,
} from '@acrofunjam/core';
import { Icon } from '../layout/Icon';
import { DifficultyDots } from './DifficultyDots';

function Difficulty({ level }: { readonly level: DifficultyLevel }) {
  return (
    <>
      {difficultyLevelName(level)}
      <DifficultyDots level={level} />
    </>
  );
}

/** Yes / No is carried by the word and the icon (tick / dash); the muted colour of "Non" is only a reinforcement. */
function FlowBoundary({ possible }: { readonly possible: boolean }) {
  return (
    <span className={`flow-boundary${possible ? '' : ' flow-boundary--no'}`}>
      <Icon name={possible ? 'check' : 'dash'} />
      {flowBoundaryAnswer(possible)}
    </span>
  );
}

/** Pose card (docs/design/composants/carte-pose.md): not interactive yet, no detail page. */
function PoseCard({ pose }: { readonly pose: PoseSummary }) {
  return (
    <li className="pose-card">
      <h2 className="pose-card__name">{pose.name}</h2>
      <dl className="pose-card__details">
        <div className="pose-card__row">
          <dt>{catalogLabels.base}</dt>
          <dd>
            <Difficulty level={pose.baseDifficulty} />
          </dd>
        </div>
        <div className="pose-card__row">
          <dt>{catalogLabels.flyer}</dt>
          <dd>
            <Difficulty level={pose.flyerDifficulty} />
          </dd>
        </div>
        <div className="pose-card__row pose-card__row--first-boundary">
          <dt>{catalogLabels.canStartFlow}</dt>
          <dd>
            <FlowBoundary possible={pose.canStartFlow} />
          </dd>
        </div>
        <div className="pose-card__row">
          <dt>{catalogLabels.canEndFlow}</dt>
          <dd>
            <FlowBoundary possible={pose.canEndFlow} />
          </dd>
        </div>
      </dl>
    </li>
  );
}

type PoseListProps = { readonly poses: readonly PoseSummary[] };

/** Grid of pose cards, in the order received (the API sorts them, ADR 0007). */
export function PoseList({ poses }: PoseListProps) {
  return (
    // role="list" restores the list semantics that some browsers drop with "list-style: none".
    <ul className="pose-grid" role="list" aria-label={catalogLabels.poseList}>
      {poses.map((pose) => (
        <PoseCard key={pose.id} pose={pose} />
      ))}
    </ul>
  );
}
