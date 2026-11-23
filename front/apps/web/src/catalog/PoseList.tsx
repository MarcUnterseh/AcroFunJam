import {
  catalogLabels,
  difficultyLevelName,
  revisionLabels,
  flowBoundaryAnswer,
  type DifficultyLevel,
  type PoseSummary,
  type TagReference,
} from '@acrofunjam/core';
import { Link } from 'react-router';
import { TagLine } from '../layout/tag-parts';
import { Icon } from '../layout/Icon';
import { posePath, revisionPath } from '../paths';
import { DifficultyMoon } from './DifficultyMoon';

/**
 * Role pill (docs/design/composants/pastille-role.md): « Base » in the colour of the earth, « Flyer » in the colour of
 * the sky, then the moon phase and the level written in full. A term and its value of a description list: read
 * « Base : Intermédiaire ».
 */
function RolePill({
  role,
  label,
  level,
}: {
  readonly role: 'base' | 'flyer';
  readonly label: string;
  readonly level: DifficultyLevel;
}) {
  return (
    <div className={`role-pill role-pill--${role}`}>
      <dt className="role-pill__tag">{label}</dt>
      <dd className="role-pill__level">
        <DifficultyMoon level={level} />
        {difficultyLevelName(level)}
      </dd>
    </div>
  );
}

/**
 * A flow boundary (principes.md, « Bornes de flow »): a sunrise or a sunset when possible, the question struck
 * through and muted when not; « Oui » / « Non » always written, colour and strike are only reinforcements.
 */
function FlowBoundary({
  label,
  icon,
  possible,
}: {
  readonly label: string;
  readonly icon: 'rise' | 'set';
  readonly possible: boolean;
}) {
  return (
    <div className={`flow-boundary flow-boundary--${possible ? 'yes' : 'no'}`}>
      <dt>
        <Icon name={icon} />
        <span className="flow-boundary__question">{label}</span>
      </dt>
      <dd>{flowBoundaryAnswer(possible)}</dd>
    </div>
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
      <RolePill role="base" label={catalogLabels.base} level={difficulties.baseDifficulty} />
      <RolePill role="flyer" label={catalogLabels.flyer} level={difficulties.flyerDifficulty} />
    </>
  );
}

type Difficulties = Pick<PoseSummary, 'baseDifficulty' | 'flyerDifficulty'>;

/**
 * The two difficulties of a transition (element-transition.md, carte-transition.md): the role pills of a pose card,
 * unchanged.
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
export function PoseDetails({
  pose,
  tags = [],
  showNoTags = false,
}: {
  readonly pose: PoseCharacteristics;
  /** Story 9a: the tags of the pose, a third group after the flow boundaries; nothing without any. */
  readonly tags?: readonly TagReference[];
  /** « aucune » where the line is always present (the validation queue). */
  readonly showNoTags?: boolean;
}) {
  return (
    <dl className="pose-card__details">
      <div className="pose-card__roles">
        <DifficultyRows difficulties={pose} />
      </div>
      <div className="pose-card__flow">
        <FlowBoundary label={catalogLabels.canStartFlow} icon="rise" possible={pose.canStartFlow} />
        <FlowBoundary label={catalogLabels.canEndFlow} icon="set" possible={pose.canEndFlow} />
      </div>
      <TagLine tags={tags} showNone={showNoTags} inList />
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
      {/* The top row keeps a slot for the glyph of the pose (carte-pose.md, « Glyphe »), drawn later: a decorative
          <svg className="pose-card__glyph" aria-hidden="true"> after the title, nothing else to change. */}
      <div className="pose-card__top">
        <h2 className="pose-card__name">
          <Link to={posePath(pose.id)} className="pose-card__link">
            {pose.name}
          </Link>
        </h2>
        {/* Story 10 (R16, carte-pose.md « Vignette », à l'essai): the main photo, decorative; nothing without one. */}
        {pose.thumbnail && (
          <img className="pose-card__thumbnail" src={pose.thumbnail} alt="" width={80} height={80} loading="lazy" />
        )}
      </div>
      <PoseDetails pose={pose} tags={pose.tags} />
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
