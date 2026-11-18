import {
  transitionAdjustmentLine,
  transitionCardTitle,
  transitionProposalLabels,
  validationLabels,
  type TransitionAdjustment,
  type TransitionContent,
  type TransitionTitle,
} from '@acrofunjam/core';
import { DifficultyDetails } from '../catalog/PoseList';
import { TagLine } from '../layout/tag-parts';
import { ValueChangeList } from './ValueChangeList';

// The parts of a transition shared by its cards: the validation queue and « Mes propositions » (carte-transition.md).

/** « Transition Ninja Star de Star vers Star »: the names emphasised, the linking words in regular weight. */
export function TransitionTitleText({ transition }: { readonly transition: TransitionTitle }) {
  return (
    <>
      {transitionCardTitle(transition).map((part, index) =>
        part.emphasised ? <strong key={index}>{part.text}</strong> : part.text,
      )}
    </>
  );
}

/**
 * The transition as it will be published: its two difficulties, its tags (story 8), then its description, if any
 * (carte-transition.md). The validation queue always shows the line of the tags, « aucune » without any.
 */
export function TransitionDetails({
  transition,
  showNoTags = false,
}: {
  readonly transition: TransitionContent;
  readonly showNoTags?: boolean;
}) {
  return (
    <>
      <DifficultyDetails difficulties={transition} />
      <TagLine tags={transition.tags} showNone={showNoTags} />
      {transition.description && (
        <div className="transition-description">
          <p className="transition-description__label">{transitionProposalLabels.descriptionTitle}</p>
          <p className="transition-description__content">{transition.description}</p>
        </div>
      )}
    </>
  );
}

/** The adjusted values of a transition « proposé → retenu » (recapitulatif-ajustements.md), for both sides. */
export function TransitionAdjustmentList({
  adjustments,
}: {
  readonly adjustments: readonly TransitionAdjustment[];
}) {
  const lines = adjustments.map((adjustment) => {
    const { term, proposed, retained } = transitionAdjustmentLine(adjustment);
    return { key: adjustment.field, term, before: proposed, after: retained };
  });
  return (
    <ValueChangeList
      lines={lines}
      readingKey={validationLabels.summaryKey}
      beforeLabel={validationLabels.summaryProposed}
      afterLabel={validationLabels.summaryRetained}
    />
  );
}
