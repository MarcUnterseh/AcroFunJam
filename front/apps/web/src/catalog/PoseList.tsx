import {
  catalogLabels,
  difficultyLevelName,
  revisionLabels,
  flowBoundaryAnswer,
  type DifficultyLevel,
  type PoseSummary,
} from '@acrofunjam/core';
import { Link } from 'react-router';
import { Icon } from '../layout/Icon';
import { revisionPath } from '../paths';
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

type PoseCharacteristics = Pick<
  PoseSummary,
  'baseDifficulty' | 'flyerDifficulty' | 'canStartFlow' | 'canEndFlow'
>;

/**
 * The characteristics of a pose, as the catalog presents them (docs/design/composants/carte-pose.md); also in
 * the card of a proposal to validate (carte-proposition.md), which shows the pose as it will be published.
 */
export function PoseDetails({ pose }: { readonly pose: PoseCharacteristics }) {
  return (
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
  );
}

/**
 * Pose card (docs/design/composants/carte-pose.md): no detail page yet. A person who may propose is invited to
 * propose a modification of the pose (story 6): a text link, named « Proposer une modification de <nom> ».
 */
function PoseCard({ pose, revisable }: { readonly pose: PoseSummary; readonly revisable: boolean }) {
  return (
    <li className={`pose-card${revisable ? ' pose-card--revisable' : ''}`}>
      <h2 className="pose-card__name">{pose.name}</h2>
      <PoseDetails pose={pose} />
      {revisable && (
        <p className="pose-card__revision">
          <Link to={revisionPath(pose.id)} className="pose-card__revision-link">
            {/* The space outside the hidden part: the accessible name reads « … modification de Throne ». */}
            {`${revisionLabels.title} `}
            <span className="visually-hidden">de {pose.name}</span>
          </Link>
        </p>
      )}
    </li>
  );
}

type PoseListProps = {
  readonly poses: readonly PoseSummary[];
  /** The person may propose a modification (capability "propose"): a link on each card. */
  readonly revisable?: boolean;
};

/** Grid of pose cards, in the order received (the API sorts them, ADR 0007). */
export function PoseList({ poses, revisable = false }: PoseListProps) {
  return (
    // role="list" restores the list semantics that some browsers drop with "list-style: none".
    <ul className="pose-grid" role="list" aria-label={catalogLabels.poseList}>
      {poses.map((pose) => (
        <PoseCard key={pose.id} pose={pose} revisable={revisable} />
      ))}
    </ul>
  );
}
