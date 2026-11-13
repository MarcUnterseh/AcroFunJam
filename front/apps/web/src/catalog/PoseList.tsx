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
import { posePath, revisionPath } from '../paths';
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

/** The rows « Base » and « Flyer » of a description list (carte-pose.md), shared with the transitions (story 7). */
function DifficultyRows({ difficulties }: { readonly difficulties: Difficulties }) {
  return (
    <>
      <div className="pose-card__row">
        <dt>{catalogLabels.base}</dt>
        <dd>
          <Difficulty level={difficulties.baseDifficulty} />
        </dd>
      </div>
      <div className="pose-card__row">
        <dt>{catalogLabels.flyer}</dt>
        <dd>
          <Difficulty level={difficulties.flyerDifficulty} />
        </dd>
      </div>
    </>
  );
}

type Difficulties = Pick<PoseSummary, 'baseDifficulty' | 'flyerDifficulty'>;

/**
 * The two difficulties of a transition (element-transition.md, carte-transition.md): the rows « Base » / « Flyer » of
 * a pose card, unchanged, side by side from 40em of container.
 */
export function DifficultyDetails({ difficulties }: { readonly difficulties: Difficulties }) {
  return (
    <dl className="pose-card__details difficulty-details">
      <DifficultyRows difficulties={difficulties} />
    </dl>
  );
}

/**
 * The characteristics of a pose, as the catalog presents them (docs/design/composants/carte-pose.md); also in
 * the card of a proposal to validate (carte-proposition.md), which shows the pose as it will be published, and on
 * the page of the pose (story 7).
 */
export function PoseDetails({ pose }: { readonly pose: PoseCharacteristics }) {
  return (
    <dl className="pose-card__details">
      <DifficultyRows difficulties={pose} />
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
 * Pose card (docs/design/composants/carte-pose.md, « Carte cliquable du catalogue »): its name is the link to the
 * page of the pose (story 7), stretched over the whole card by the style, no click handler on the item. A person who
 * may propose is invited to propose a modification of the pose (story 6): a text link above the stretched one, named
 * « Proposer une modification de <nom> ».
 */
function PoseCard({ pose, revisable }: { readonly pose: PoseSummary; readonly revisable: boolean }) {
  return (
    <li className={`pose-card pose-card--linked${revisable ? ' pose-card--revisable' : ''}`}>
      <h2 className="pose-card__name">
        <Link to={posePath(pose.id)} className="pose-card__link">
          {pose.name}
        </Link>
      </h2>
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
