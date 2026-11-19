import {
  difficultyLevelName,
  flowGenerationLabels as labels,
  flowStepTitle,
  flowSummary,
  wideningHints,
  type FlowCriteria,
  type FlowPose,
  type GeneratedFlow,
  type Tag,
} from '@acrofunjam/core';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { DifficultyDetails } from '../catalog/PoseList';
import { Icon } from '../layout/Icon';
import { TagLine } from '../layout/tag-parts';
import { catalogPath, posePath } from '../paths';

/** The criteria of the flow, read again (recapitulatif-criteres.md): length, ceilings, tags chosen if any. */
export function CriteriaRecap({
  criteria,
  tags,
  level = 2,
}: {
  readonly criteria: FlowCriteria;
  readonly tags: readonly Tag[];
  /** Under the title of the panel without flow, a level lower. */
  readonly level?: 2 | 3;
}) {
  const Title = level === 2 ? 'h2' : 'h3';
  const names = (ids: readonly string[]) =>
    ids
      .map((id) => tags.find((tag) => tag.id === id)?.name)
      .filter(Boolean)
      .join(', ') || labels.none;
  return (
    <section className="criteria-recap" aria-labelledby="criteres-du-flow">
      <Title id="criteres-du-flow" className="criteria-recap__title">
        {labels.criteria}
      </Title>
      <dl className="criteria-recap__list">
        <div>
          <dt>{labels.length}</dt>
          <dd>{criteria.length}</dd>
        </div>
        <div>
          <dt>{labels.baseCeiling}</dt>
          <dd>{difficultyLevelName(criteria.baseCeiling)}</dd>
        </div>
        <div>
          <dt>{labels.flyerCeiling}</dt>
          <dd>{difficultyLevelName(criteria.flyerCeiling)}</dd>
        </div>
        {criteria.requestedTagIds.length > 0 && (
          <div>
            <dt>{labels.requested}</dt>
            <dd>{names(criteria.requestedTagIds)}</dd>
          </div>
        )}
        {criteria.excludedTagIds.length > 0 && (
          <div>
            <dt>{labels.excluded}</dt>
            <dd>{names(criteria.excludedTagIds)}</dd>
          </div>
        )}
      </dl>
    </section>
  );
}

/** A pose of the thread: « Départ : Throne » or « Vers Bird », a link to its page, its difficulties and its tags. */
function Station({
  pose,
  place,
  samePose = false,
}: {
  readonly pose: FlowPose;
  readonly place: 'start' | 'between' | 'end';
  readonly samePose?: boolean;
}) {
  return (
    <div className={`flow-station${place === 'between' ? '' : ` flow-station--${place}`}`}>
      <Icon name={place === 'start' ? 'rise' : place === 'end' ? 'set' : 'station'} />
      <div className="flow-station__content">
        <p className="flow-station__name">
          <span>{place === 'start' ? labels.start : labels.towards}</span>{' '}
          <Link to={posePath(pose.id)} className="transition__other-pose-link">
            {pose.name}
          </Link>
          {samePose && <span className="flow-station__same"> {labels.samePose}</span>}
        </p>
        <DifficultyDetails difficulties={pose} />
        <TagLine tags={pose.tags} />
      </div>
    </div>
  );
}

/** The thread of the flow (fil-du-flow.md): the start pose, then each step, its transition card and its arrival pose. */
function FlowRoute({ flow }: { readonly flow: GeneratedFlow }) {
  const last = flow.steps.length - 1;
  return (
    <div className="flow-route">
      <Station pose={flow.start} place="start" />
      <ol className="flow-route__steps" aria-label={labels.steps}>
        {flow.steps.map((step, index) => {
          const title = flowStepTitle(flow, index);
          return (
            <li key={step.number} className="flow-step">
              <article className="flow-step__card">
                <h2 className="flow-step__title">
                  <span className="flow-step__number">{title.number}</span>
                  {' · '}
                  {title.name ??
                    (title.unnamed && (
                      <>
                        <span className="visually-hidden">{title.unnamed.spoken}</span>
                        <span className="transition__poses" aria-hidden="true">
                          <span>{title.unnamed.shown[0]}</span>
                          <Icon name={step.isWashingMachine ? 'loop' : 'trajectory'} />
                          <span>{title.unnamed.shown[1]}</span>
                        </span>
                      </>
                    ))}
                </h2>
                {step.isWashingMachine && (
                  <p className="flow-step__washing-machine">
                    <Icon name="loop" />
                    <span>{labels.washingMachine}</span>
                  </p>
                )}
                <DifficultyDetails difficulties={step.transition} />
                <TagLine tags={step.transition.tags} />
                {step.transition.description && (
                  <details className="flow-step__description tag-meanings">
                    <summary className="tag-meanings__summary">
                      {labels.description}
                      <Icon name="chevronDown" />
                    </summary>
                    <p className="transition__description">{step.transition.description}</p>
                  </details>
                )}
              </article>
              <Station
                pose={step.arrival}
                place={index === last ? 'end' : 'between'}
                samePose={step.isWashingMachine}
              />
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/**
 * The flow (9-generer-un-flow.md § 3): a column of control (title, summary, same flow again, criteria, actions), then the
 * reminder of the spotter and the thread.
 */
export function FlowResult({
  flow,
  sameAsShown,
  criteria,
  tags,
  generating,
  alert,
  onGenerateAnother,
  onChangeCriteria,
}: {
  readonly flow: GeneratedFlow;
  readonly sameAsShown: boolean;
  readonly criteria: FlowCriteria;
  readonly tags: readonly Tag[];
  readonly generating: boolean;
  readonly alert: ReactNode;
  readonly onGenerateAnother: () => void;
  readonly onChangeCriteria: () => void;
}) {
  return (
    <div className="flow-result">
      <div className="flow-result__aside">
        <h1 tabIndex={-1}>{labels.title}</h1>
        <p className="flow-result__summary">{flowSummary(flow)}</p>
        {sameAsShown && (
          // Announced by the page (useAnnounce): inserted with the focus on the title, a new live region would be missed.
          <div className="form-alert form-alert--info">
            <Icon name="info" />
            <p>{labels.sameFlowAgain}</p>
          </div>
        )}
        <CriteriaRecap criteria={criteria} tags={tags} />
        <div className="flow-result__actions">
          <button
            type="button"
            className="button button--primary"
            aria-disabled={generating || undefined}
            onClick={() => !generating && onGenerateAnother()}
          >
            {generating ? labels.generating : labels.generateAnother}
          </button>
          <button type="button" className="button button--secondary" onClick={onChangeCriteria}>
            {labels.changeCriteria}
          </button>
        </div>
        {alert}
      </div>
      <div className="flow-result__route">
        <p className="safety-note">
          <Icon name="spot" />
          <span>{labels.spotterReminder}</span>
        </p>
        <FlowRoute flow={flow} />
      </div>
    </div>
  );
}

/** No flow (panneau-sans-flow.md): the criteria too restrictive, with the leads that apply, or a catalog not ready yet. */
export function NoFlow({
  kind,
  criteria,
  tags,
  onChangeCriteria,
}: {
  readonly kind: 'criteria-too-restrictive' | 'catalog-insufficient';
  readonly criteria: FlowCriteria;
  readonly tags: readonly Tag[];
  readonly onChangeCriteria: () => void;
}) {
  if (kind === 'catalog-insufficient')
    return (
      <section className="no-flow" aria-labelledby="sans-flow">
        <Icon name="info" />
        {/* One message, title then detail, read as such. */}
        <div className="no-flow__message">
          <h2 id="sans-flow" tabIndex={-1}>
            {labels.catalogInsufficient}
          </h2>{' '}
          <p>{labels.catalogInsufficientDetail}</p>
        </div>
        <div className="form-actions">
          <Link to={catalogPath} className="button button--secondary link-button">
            {labels.seeCatalog}
          </Link>
        </div>
      </section>
    );
  const hints = wideningHints(criteria);
  return (
    <section className="no-flow" aria-labelledby="sans-flow">
      <Icon name="info" />
      <h2 id="sans-flow" tabIndex={-1}>
        {labels.tooRestrictive}
      </h2>
      <CriteriaRecap criteria={criteria} tags={tags} level={3} />
      {hints.length > 0 && (
        <>
          <p>{labels.wideningLead}</p>
          <ul className="no-flow__tips">
            {hints.map((hint, index) => (
              <li key={hint}>
                {hint}
                {index === hints.length - 1 ? '.' : ' ;'}
              </li>
            ))}
          </ul>
        </>
      )}
      <div className="form-actions">
        <button type="button" className="button button--primary" onClick={onChangeCriteria}>
          {labels.changeCriteria}
        </button>
      </div>
    </section>
  );
}
