import {
  flowGenerationLabels as labels,
  generateAnotherFlow,
  generateFlow,
  tagsNoLongerAvailableLabel,
  withoutTags,
  type FlowCriteria,
  type FlowGenerationFailure,
  type GeneratedFlow,
  type Tag,
} from '@acrofunjam/core';
import { useEffect, useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { useTags } from '../catalog/useTags';
import { useAnnounce } from '../layout/Announcer';
import { focusPageTitle } from '../layout/focus';
import { Icon } from '../layout/Icon';
import { catalogPath, flowGeneratorPath } from '../paths';
import { criteriaOf, searchOf } from './criteria-search';
import { useFlowGenerationGateway } from './FlowGenerationContext';
import { FlowGeneratorForm } from './FlowGeneratorForm';
import { FlowResult, NoFlow } from './FlowResult';

/** What the history keeps of a generation (UX-2): the flow, or why there is none. */
type Outcome =
  | { readonly kind: 'flow'; readonly flow: GeneratedFlow; readonly sameAsShown: boolean }
  | { readonly kind: 'criteria-too-restrictive' }
  | { readonly kind: 'catalog-insufficient' };

const outcomeOf = (state: unknown): Outcome | null =>
  typeof state === 'object' && state !== null && 'outcome' in state ? (state.outcome as Outcome) : null;

/** An alert of the form or of the flow: the outage (with « Réessayer »), a tag gone, an outdated site. */
type Problem =
  | { readonly kind: 'unreachable'; readonly retry: () => void; readonly retrying?: boolean }
  | { readonly kind: 'tags-gone'; readonly names: readonly string[] }
  | { readonly kind: 'outdated' };

function ProblemAlert({ problem }: { readonly problem: Problem | null }): ReactNode {
  if (!problem) return null;
  if (problem.kind === 'tags-gone')
    return (
      // Takes the focus: the form was drawn again without the tags gone (WCAG 2.4.3).
      <div id="etiquette-retiree" className="form-alert form-alert--info" role="alert" tabIndex={-1}>
        <Icon name="info" />
        <p>{tagsNoLongerAvailableLabel(problem.names)}</p>
      </div>
    );
  return (
    <div className="form-alert" role="alert">
      <Icon name="error" />
      <div className="form-alert__content">
        <p>{problem.kind === 'unreachable' ? labels.unreachable : labels.outdated}</p>
        {problem.kind === 'unreachable' && (
          <button
            type="button"
            className="button button--secondary"
            aria-disabled={problem.retrying || undefined}
            onClick={() => !problem.retrying && problem.retry()}
          >
            {labels.retry}
          </button>
        )}
      </div>
    </div>
  );
}

function BackLink() {
  return (
    <Link to={catalogPath} className="back-link">
      <Icon name="chevronLeft" />
      {labels.backToCatalog}
    </Link>
  );
}

/**
 * The page « Générer un flow » (story 9, 9-generer-un-flow.md): the form and the result alternate on the same page. The
 * criteria are in the address, the result in the history state: coming back from the page of a pose finds the flow.
 */
export function FlowGeneratorPage() {
  const gateway = useFlowGenerationGateway();
  const location = useLocation();
  const navigate = useNavigate();
  const tagList = useTags();
  const criteria = criteriaOf(location.search);
  const outcome = outcomeOf(location.state);
  const [gone, setGone] = useState<readonly string[]>([]);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [generating, setGenerating] = useState(false);
  // The form starts again from these criteria: the address, or the address without the tags gone.
  const [formStart, setFormStart] = useState<{
    readonly criteria: FlowCriteria;
    readonly version: number;
  } | null>(null);
  const tags: readonly Tag[] = (tagList.data ?? []).filter((tag) => !gone.includes(tag.id));
  const announce = useAnnounce();
  const sameAsShown = outcome?.kind === 'flow' && outcome.sameAsShown;

  // A new state of the page: its title, or the panel without flow (its own title tells what happened); an alert of the
  // previous state (an outage) goes, but not the tags gone, shown with the form drawn again.
  useEffect(() => {
    if (outcome && outcome.kind !== 'flow') document.getElementById('sans-flow')?.focus();
    else focusPageTitle();
    setProblem((previous) => (previous?.kind === 'tags-gone' ? previous : null));
    if (sameAsShown) announce(labels.sameFlowAgain);
  }, [location.key]);

  useEffect(() => {
    if (formStart) document.getElementById('etiquette-retiree')?.focus();
  }, [formStart]);

  const show = (next: Outcome, chosen: FlowCriteria, replace = false) => {
    setProblem(null);
    setFormStart(null);
    void navigate(
      { pathname: flowGeneratorPath, search: searchOf(chosen) },
      { state: { outcome: next }, replace },
    );
  };

  const failed = (
    failure: FlowGenerationFailure,
    chosen: FlowCriteria,
    retry: () => void,
    replace = false,
  ) => {
    switch (failure.kind) {
      case 'criteria-too-restrictive':
      case 'catalog-insufficient':
        show({ kind: failure.kind }, chosen, replace);
        return;
      case 'tags-not-in-list': {
        // A tag no longer named by the list (read again meanwhile) is not shown by its identifier.
        const names = failure.tagIds.flatMap((id) => tagList.data?.find((tag) => tag.id === id)?.name ?? []);
        setGone((previous) => [...previous, ...failure.tagIds]);
        setFormStart((previous) => ({
          criteria: withoutTags(chosen, failure.tagIds),
          version: (previous?.version ?? 0) + 1,
        }));
        setProblem({ kind: 'tags-gone', names });
        if (outcome)
          void navigate({
            pathname: flowGeneratorPath,
            search: searchOf(withoutTags(chosen, failure.tagIds)),
          });
        return;
      }
      case 'unreachable':
        setProblem({
          kind: 'unreachable',
          retry: () => {
            setProblem({ kind: 'unreachable', retry, retrying: true });
            retry();
          },
        });
        return;
      case 'outdated':
        setProblem({ kind: 'outdated' });
    }
  };

  const generate = async (chosen: FlowCriteria) => {
    setGenerating(true);
    const drawn = await generateFlow(gateway, chosen);
    setGenerating(false);
    if (drawn.ok) show({ kind: 'flow', flow: drawn.value, sameAsShown: false }, chosen);
    else failed(drawn.error, chosen, () => void generate(chosen));
  };

  const generateAnother = async (shown: GeneratedFlow) => {
    setGenerating(true);
    const drawn = await generateAnotherFlow(gateway, criteria, shown);
    setGenerating(false);
    if (drawn.ok) {
      show({ kind: 'flow', ...drawn.value }, criteria, true);
      focusPageTitle();
    } else failed(drawn.error, criteria, () => void generateAnother(shown), true);
  };

  const changeCriteria = () => {
    setProblem(null);
    void navigate({ pathname: flowGeneratorPath, search: searchOf(criteria) });
  };

  if (outcome?.kind === 'flow')
    return (
      <>
        <BackLink />
        <FlowResult
          flow={outcome.flow}
          sameAsShown={outcome.sameAsShown}
          criteria={criteria}
          tags={tagList.data ?? []}
          generating={generating}
          alert={<ProblemAlert problem={problem} />}
          onGenerateAnother={() => void generateAnother(outcome.flow)}
          onChangeCriteria={changeCriteria}
        />
      </>
    );

  return (
    <div className="generator">
      <BackLink />
      <h1 tabIndex={-1}>{labels.generate}</h1>
      {outcome ? (
        <NoFlow
          kind={outcome.kind}
          criteria={criteria}
          tags={tagList.data ?? []}
          onChangeCriteria={changeCriteria}
        />
      ) : (
        <>
          <p className="generator__intro">{labels.intro}</p>
          <FlowGeneratorForm
            key={`${location.key}-${formStart?.version ?? 0}`}
            initial={formStart?.criteria ?? criteria}
            tags={tags}
            tagsFailed={tagList.isError}
            alert={<ProblemAlert problem={problem} />}
            tagsOpen={problem?.kind === 'tags-gone'}
            generating={generating}
            onGenerate={(chosen) => void generate(chosen)}
          />
        </>
      )}
    </div>
  );
}
