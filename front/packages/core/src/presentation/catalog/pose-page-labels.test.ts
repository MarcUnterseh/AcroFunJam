import { describe, expect, it } from 'vitest';
import {
  emptyTransitionsLabel,
  otherPoseLead,
  posePageLabels,
  proposeTransitionFromLabel,
  transitionsSectionTitle,
  unnamedTransitionLabel,
} from './pose-page-labels';

describe('posePageLabels', () => {
  it('should warn that falls happen mostly during transitions, with the vocabulary of the glossary', () => {
    expect(posePageLabels.responsibilityWarning).toBe(
      'Tu restes juge de tes limites. Les chutes arrivent surtout pendant les transitions : apprends-les avec un spotter.',
    );
  });

  it('should mark the other pose of a washing machine as the same pose', () => {
    expect(posePageLabels.samePose).toBe('(même pose)');
  });

  it('should title the page of an unknown pose « Pose introuvable »', () => {
    expect(posePageLabels.notFoundTitle).toBe('Pose introuvable');
  });
});

describe('transitionsSectionTitle', () => {
  it('should name the section of the transitions from the pose', () => {
    expect(transitionsSectionTitle('from', 'Throne')).toBe('Transitions depuis Throne');
  });

  it('should name the section of the transitions to the pose', () => {
    expect(transitionsSectionTitle('to', 'Throne')).toBe('Transitions vers Throne');
  });
});

describe('emptyTransitionsLabel', () => {
  it('should tell that no transition starts from the pose yet', () => {
    expect(emptyTransitionsLabel('from', 'Star')).toBe("Aucune transition ne part de Star pour l'instant.");
  });

  it('should tell that no transition arrives at the pose yet', () => {
    expect(emptyTransitionsLabel('to', 'Star')).toBe("Aucune transition n'arrive à Star pour l'instant.");
  });
});

describe('otherPoseLead', () => {
  it('should lead the arrival pose of a transition from the pose with « Vers »', () => {
    expect(otherPoseLead('from')).toBe('Vers');
  });

  it('should lead the departure pose of a transition to the pose with « Depuis »', () => {
    expect(otherPoseLead('to')).toBe('Depuis');
  });
});

describe('unnamedTransitionLabel', () => {
  it('should present a transition without a name by its poses, with an arrow', () => {
    expect(unnamedTransitionLabel({ from: 'Throne', to: 'Bird' }).shown).toEqual(['Throne', 'Bird']);
  });

  it('should be read « de Throne vers Bird » by screen readers', () => {
    expect(unnamedTransitionLabel({ from: 'Throne', to: 'Bird' }).spoken).toBe('de Throne vers Bird');
  });
});

describe('proposeTransitionFromLabel', () => {
  it('should invite to propose a transition from the pose consulted', () => {
    expect(proposeTransitionFromLabel('Throne')).toBe('Proposer une transition depuis Throne');
  });
});
