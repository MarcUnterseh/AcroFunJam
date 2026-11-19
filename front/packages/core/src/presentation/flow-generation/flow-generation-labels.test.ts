import { describe, expect, it } from 'vitest';
import { defaultFlowCriteria } from '../../domain/flow-generation/flow-criteria';
import type { FlowStep, GeneratedFlow } from '../../domain/flow-generation/generated-flow';
import {
  chosenTagsCountLabel,
  flowGenerationLabels,
  flowStepTitle,
  flowSummary,
  tagsNoLongerAvailableLabel,
  wideningHints,
} from './flow-generation-labels';

// Story 9 « Générer un flow »: the texts of the generator (docs/design/ecrans/9-generer-un-flow.md, decisions of 2026-11-19).

const pose = (name: string) =>
  ({ id: name, name, baseDifficulty: 'beginner', flyerDifficulty: 'beginner', tags: [] }) as const;

const step = (number: number, name: string | null, arrival: string, isWashingMachine = false): FlowStep => ({
  number,
  transition: {
    id: `t${number}`,
    name,
    baseDifficulty: 'beginner',
    flyerDifficulty: 'beginner',
    description: null,
    tags: [],
  },
  isWashingMachine,
  arrival: pose(arrival),
});

const flow = (start: string, ...steps: FlowStep[]): GeneratedFlow => ({ start: pose(start), steps });

describe('flow generation labels', () => {
  it('should summarise a flow by its number of transitions, its start and its end', () => {
    expect(flowSummary(flow('Throne', step(1, null, 'Bird'), step(2, null, 'Folded Leaf')))).toBe(
      '2 transitions, de Throne à Folded Leaf.',
    );
  });

  it('should say « 1 transition » in the singular', () => {
    expect(flowSummary(flow('Throne', step(1, null, 'Bird')))).toBe('1 transition, de Throne à Bird.');
  });

  it('should title a step by the name of its transition', () => {
    expect(flowStepTitle(flow('Throne', step(1, 'Pop to Bird', 'Bird')), 0)).toEqual({
      number: 'Étape 1',
      name: 'Pop to Bird',
      unnamed: null,
    });
  });

  it('should title a step without a transition name by its poses, read « de … vers … »', () => {
    expect(
      flowStepTitle(flow('Throne', step(1, 'Pop to Bird', 'Bird'), step(2, null, 'Folded Leaf')), 1),
    ).toEqual({
      number: 'Étape 2',
      name: null,
      unnamed: { shown: ['Bird', 'Folded Leaf'], spoken: 'de Bird vers Folded Leaf' },
    });
  });

  it('should count the chosen tags in the summary of the fold', () => {
    expect([chosenTagsCountLabel(0), chosenTagsCountLabel(1), chosenTagsCountLabel(3)]).toEqual([
      null,
      '1 choisie',
      '3 choisies',
    ]);
  });

  it('should name the tags no longer available', () => {
    expect(tagsNoLongerAvailableLabel(['vrille'])).toBe(
      "L'étiquette « vrille » n'est plus disponible. Vérifie tes étiquettes, puis génère de nouveau ton flow.",
    );
    expect(tagsNoLongerAvailableLabel(['vrille', 'whip'])).toBe(
      'Les étiquettes « vrille » et « whip » ne sont plus disponibles. Vérifie tes étiquettes, puis génère de nouveau ton flow.',
    );
  });

  it('should tell a tag gone without its name when the list no longer names it', () => {
    expect(tagsNoLongerAvailableLabel([])).toBe(
      "Une étiquette choisie n'est plus disponible. Vérifie tes étiquettes, puis génère de nouveau ton flow.",
    );
  });

  it('should suggest fewer transitions and higher ceilings when no tag is chosen', () => {
    expect(wideningHints({ ...defaultFlowCriteria, length: 2 })).toEqual([
      'moins de transitions',
      'des plafonds de difficulté plus hauts',
    ]);
  });

  it('should suggest fewer excluded tags when some are excluded', () => {
    expect(wideningHints({ ...defaultFlowCriteria, length: 2, excludedTagIds: ['vrille'] })).toEqual([
      'moins de transitions',
      'des plafonds de difficulté plus hauts',
      "moins d'étiquettes exclues",
    ]);
  });

  it('should suggest more requested tags, or none, when some are requested', () => {
    expect(wideningHints({ ...defaultFlowCriteria, length: 2, requestedTagIds: ['lunaire'] })).toEqual([
      'moins de transitions',
      'des plafonds de difficulté plus hauts',
      "plus d'étiquettes demandées, ou aucune",
    ]);
  });

  it('should not suggest fewer transitions for a flow of 1 transition', () => {
    expect(
      wideningHints({
        ...defaultFlowCriteria,
        length: 1,
        baseCeiling: 'advanced',
        flyerCeiling: 'advanced',
        excludedTagIds: ['x'],
      }),
    ).toEqual(['des plafonds de difficulté plus hauts', "moins d'étiquettes exclues"]);
  });

  it('should remind of the spotter with every flow', () => {
    expect(flowGenerationLabels.spotterReminder).toBe(
      "Ce flow est tiré au hasard : il peut contenir des transitions que ton duo n'a jamais faites. Travaillez-les d'abord une par une, avec un spotter. Chacun peut dire stop à tout moment.",
    );
  });
});
