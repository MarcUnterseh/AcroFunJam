import { describe, expect, it } from 'vitest';
import { fail, ok } from '../../domain/common/result';
import { defaultFlowCriteria, type FlowCriteria } from '../../domain/flow-generation/flow-criteria';
import type { GeneratedFlow } from '../../domain/flow-generation/generated-flow';
import type { FlowGenerationFailure, FlowGenerationGateway } from './FlowGenerationGateway';
import { generateAnotherFlow, generateFlow } from './generate-flow';

// Story 9 « Générer un flow »: anyone draws a flow (POST /flow-generation/flows, ADR 0037); nothing is recorded.

const aFlow = (transitionId: string): GeneratedFlow => ({
  start: { id: 'throne', name: 'Throne', baseDifficulty: 'beginner', flyerDifficulty: 'beginner', tags: [] },
  steps: [
    {
      number: 1,
      transition: {
        id: transitionId,
        name: null,
        baseDifficulty: 'beginner',
        flyerDifficulty: 'beginner',
        description: null,
        tags: [],
      },
      isWashingMachine: false,
      arrival: {
        id: 'bird',
        name: 'Bird',
        baseDifficulty: 'beginner',
        flyerDifficulty: 'beginner',
        tags: [],
      },
    },
  ],
});

const answering = (...answers: Array<Awaited<ReturnType<FlowGenerationGateway['generateFlow']>>>) => {
  const sent: FlowCriteria[] = [];
  const gateway: FlowGenerationGateway = {
    generateFlow: async (criteria) => {
      sent.push(criteria);
      return answers.shift()!;
    },
  };
  return { gateway, sent };
};

describe('generateFlow', () => {
  it('should send the criteria and give the flow drawn', async () => {
    const { gateway, sent } = answering(ok(aFlow('t1')));
    const criteria: FlowCriteria = { ...defaultFlowCriteria, length: 1, requestedTagIds: ['lunaire'] };

    expect(await generateFlow(gateway, criteria)).toEqual(ok(aFlow('t1')));
    expect(sent).toEqual([criteria]);
  });

  it.each<FlowGenerationFailure>([
    { kind: 'criteria-too-restrictive' },
    { kind: 'catalog-insufficient' },
    { kind: 'tags-not-in-list', tagIds: ['vrille'] },
    { kind: 'unreachable' },
    { kind: 'outdated' },
  ])('should give the reason when no flow is drawn ($kind)', async (failure) => {
    expect(await generateFlow(answering(fail(failure)).gateway, defaultFlowCriteria)).toEqual(fail(failure));
  });
});

describe('generateAnotherFlow', () => {
  it('should replay the criteria of the flow shown and tell when the same flow came out', async () => {
    const { gateway, sent } = answering(ok(aFlow('t1')));

    expect(await generateAnotherFlow(gateway, defaultFlowCriteria, aFlow('t1'))).toEqual(
      ok({ flow: aFlow('t1'), sameAsShown: true }),
    );
    expect(sent).toEqual([defaultFlowCriteria]);
  });

  it('should tell that another flow came out when it differs from the one shown', async () => {
    expect(
      await generateAnotherFlow(answering(ok(aFlow('t2'))).gateway, defaultFlowCriteria, aFlow('t1')),
    ).toEqual(ok({ flow: aFlow('t2'), sameAsShown: false }));
  });

  it('should give the reason when no other flow is drawn', async () => {
    expect(
      await generateAnotherFlow(
        answering(fail({ kind: 'unreachable' })).gateway,
        defaultFlowCriteria,
        aFlow('t1'),
      ),
    ).toEqual(fail({ kind: 'unreachable' }));
  });
});
