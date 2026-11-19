import { describe, expect, it } from 'vitest';
import { endPose, sameFlow, type GeneratedFlow, type FlowPose } from './generated-flow';

// Story 9 « Générer un flow »: a generated flow, its start pose, then numbered steps (G1 to G4).

const pose = (id: string): FlowPose => ({
  id,
  name: id,
  baseDifficulty: 'beginner',
  flyerDifficulty: 'beginner',
  tags: [],
});

const flow = (start: string, ...steps: Array<[string, string]>): GeneratedFlow => ({
  start: pose(start),
  steps: steps.map(([transition, arrival], index) => ({
    number: index + 1,
    transition: {
      id: transition,
      name: null,
      baseDifficulty: 'beginner',
      flyerDifficulty: 'beginner',
      description: null,
      tags: [],
    },
    isWashingMachine: false,
    arrival: pose(arrival),
  })),
});

describe('generated flow', () => {
  it('should end on the arrival pose of its last step', () => {
    expect(endPose(flow('Throne', ['t1', 'Bird'], ['t2', 'Folded Leaf'])).name).toBe('Folded Leaf');
  });

  it('should be the same flow when it starts from the same pose by the same transitions', () => {
    expect(sameFlow(flow('Throne', ['t1', 'Bird']), flow('Throne', ['t1', 'Bird']))).toBe(true);
  });

  it('should be another flow when one transition differs', () => {
    expect(sameFlow(flow('Throne', ['t1', 'Bird']), flow('Throne', ['t2', 'Bird']))).toBe(false);
  });

  it('should be another flow when it starts from another pose', () => {
    expect(sameFlow(flow('Throne', ['t1', 'Bird']), flow('Star', ['t1', 'Bird']))).toBe(false);
  });
});
