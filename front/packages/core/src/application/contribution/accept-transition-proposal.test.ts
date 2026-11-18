import { describe, expect, it } from 'vitest';
import { fail, ok, type Result } from '../../domain/common/result';
import type { TransitionAdjustmentInput } from '../../domain/contribution/transition-adjustment';
import type { TransitionDescription } from '../../domain/shared-kernel/transition-description';
import type { TransitionName } from '../../domain/shared-kernel/transition-name';
import type { DecisionInputStore, KeptDecisionInputs } from './DecisionInputStorePort';
import { acceptTransitionProposal, listTransitionTags, rejectProposal } from './validation-use-cases';
import type {
  DecisionFailure,
  PendingTransitionProposal,
  ProposalReference,
  TransitionAcceptance,
  TransitionAcceptanceOutcome,
  ValidationGateway,
} from './ValidationGateway';

// Story 7: the validator accepts a transition, as proposed or with adjustments (name, difficulties, description).

const owner = 'bruno@example.org';

const ninjaStar: PendingTransitionProposal = {
  kind: 'transition-proposal',
  id: 'transition-ninja-star',
  fromPose: { id: 'pose-star', name: 'Star' },
  toPose: { id: 'pose-star', name: 'Star' },
  transition: {
    name: 'ninja star' as TransitionName,
    baseDifficulty: 'advanced',
    flyerDifficulty: 'intermediate',
    description: 'Vidéo : https://example.org/ninja-star' as TransitionDescription,
    tags: [{ id: 'tag-inversion', name: 'inversion' }],
  },
  contributor: { email: 'alice@example.org', isYou: false },
  submittedAt: new Date('2026-11-14T09:00:00Z'),
};

const published: TransitionAcceptanceOutcome = {
  name: 'ninja star',
  fromPose: ninjaStar.fromPose,
  toPose: ninjaStar.toPose,
  adjusted: false,
};

const pop = { id: 'tag-pop', name: 'pop', description: 'Propulsé.', impliedTagId: 'tag-dynamique' };

class FakeGateway
  implements Pick<ValidationGateway, 'acceptTransitionProposal' | 'rejectProposal' | 'listTags'>
{
  answer: Result<TransitionAcceptanceOutcome, DecisionFailure> = ok(published);
  tags: Awaited<ReturnType<ValidationGateway['listTags']>> = ok([pop]);
  listTags = async () => this.tags;
  readonly accepted: Array<{ proposal: ProposalReference; acceptance: TransitionAcceptance }> = [];
  readonly rejected: ProposalReference[] = [];
  acceptTransitionProposal = async ({ id, kind }: ProposalReference, acceptance: TransitionAcceptance) => {
    this.accepted.push({ proposal: { id, kind }, acceptance });
    return this.answer;
  };
  rejectProposal = async ({ id, kind }: ProposalReference) => {
    this.rejected.push({ id, kind });
    return ok(undefined);
  };
}

class MemoryStore implements DecisionInputStore {
  kept: KeptDecisionInputs | null = null;
  load = () => this.kept;
  save = (kept: KeptDecisionInputs) => void (this.kept = kept);
  clear = () => void (this.kept = null);
}

const gatewayOf = (fake: FakeGateway) => fake as unknown as ValidationGateway;

const retained = (input: Partial<TransitionAdjustmentInput>): TransitionAdjustmentInput => ({
  name: 'ninja star',
  baseDifficulty: 'advanced',
  flyerDifficulty: 'intermediate',
  description: 'Vidéo : https://example.org/ninja-star',
  tags: [{ id: 'tag-inversion', name: 'inversion' }],
  ...input,
});

describe('acceptTransitionProposal', () => {
  it('should accept the transition as proposed, at the address of a transition', async () => {
    const gateway = new FakeGateway();

    const result = await acceptTransitionProposal(
      gatewayOf(gateway),
      new MemoryStore(),
      ninjaStar,
      null,
      owner,
    );

    expect(result).toEqual(ok(published));
    expect(gateway.accepted).toEqual([
      {
        proposal: { id: 'transition-ninja-star', kind: 'transition-proposal' },
        acceptance: { adjustments: [], note: null },
      },
    ]);
  });

  it('should send the adjusted values only, with the note', async () => {
    const gateway = new FakeGateway();

    await acceptTransitionProposal(
      gatewayOf(gateway),
      new MemoryStore(),
      ninjaStar,
      { input: retained({ name: 'Ninja Star', flyerDifficulty: 'advanced' }), note: ' Nom usuel. ' },
      owner,
    );

    expect(gateway.accepted[0]?.acceptance).toEqual({
      adjustments: [
        { field: 'name', proposed: 'ninja star', retained: 'Ninja Star' },
        { field: 'flyerDifficulty', proposed: 'intermediate', retained: 'advanced' },
      ],
      note: 'Nom usuel.',
    });
  });

  it('should send other retained tags as an adjustment of the tags', async () => {
    const gateway = new FakeGateway();
    const tags = [
      { id: 'tag-dynamique', name: 'dynamique' },
      { id: 'tag-pop', name: 'pop' },
    ];

    await acceptTransitionProposal(
      gatewayOf(gateway),
      new MemoryStore(),
      ninjaStar,
      { input: retained({ tags }), note: '' },
      owner,
    );

    expect(gateway.accepted[0]?.acceptance.adjustments).toEqual([
      { field: 'tags', proposed: [{ id: 'tag-inversion', name: 'inversion' }], retained: tags },
    ]);
  });

  it('should tell the retained tags left the list meanwhile', async () => {
    const gateway = new FakeGateway();
    gateway.answer = fail({ kind: 'tags-not-in-list' });

    const result = await acceptTransitionProposal(gatewayOf(gateway), new MemoryStore(), ninjaStar, null, owner);

    expect(result).toEqual(fail({ kind: 'tags-not-in-list' }));
  });

  it('should accept as proposed, without the note, when nothing differs', async () => {
    const gateway = new FakeGateway();

    await acceptTransitionProposal(
      gatewayOf(gateway),
      new MemoryStore(),
      ninjaStar,
      { input: retained({}), note: 'Rien à redire.' },
      owner,
    );

    expect(gateway.accepted[0]?.acceptance).toEqual({ adjustments: [], note: null });
  });

  it('should send nothing when a retained value breaks a rule', async () => {
    const gateway = new FakeGateway();

    const result = await acceptTransitionProposal(
      gatewayOf(gateway),
      new MemoryStore(),
      ninjaStar,
      { input: retained({ description: 'x'.repeat(501) }), note: '' },
      owner,
    );

    expect(result).toEqual(
      fail({
        kind: 'invalid-input',
        errors: [{ field: 'description', code: 'transition.description-too-long' }],
      }),
    );
    expect(gateway.accepted).toEqual([]);
  });

  it('should tell the place of the transition is taken between its poses', async () => {
    const gateway = new FakeGateway();
    gateway.answer = fail({ kind: 'transition-name-already-in-catalog' });

    const result = await acceptTransitionProposal(
      gatewayOf(gateway),
      new MemoryStore(),
      ninjaStar,
      null,
      owner,
    );

    expect(result).toEqual(fail({ kind: 'transition-name-already-in-catalog' }));
  });

  it('should keep the adjustments typed for the transition after an outage', async () => {
    const gateway = new FakeGateway();
    gateway.answer = fail({ kind: 'unreachable' });
    const store = new MemoryStore();
    const input = retained({ name: 'Ninja Star' });

    await acceptTransitionProposal(gatewayOf(gateway), store, ninjaStar, { input, note: '' }, owner);

    expect(store.kept).toEqual({
      owner,
      decisions: { 'transition-ninja-star': { kind: 'transition-acceptance', input, note: '' } },
    });
  });
});

describe('rejectProposal of a transition', () => {
  it('should reject the transition at the address of a transition', async () => {
    const gateway = new FakeGateway();

    await rejectProposal(gatewayOf(gateway), new MemoryStore(), ninjaStar, 'Doublon.', owner);

    expect(gateway.rejected).toEqual([{ id: 'transition-ninja-star', kind: 'transition-proposal' }]);
  });
});

describe('listTransitionTags', () => {
  it('should give the tags of the list, to adjust those of a transition', async () => {
    expect(await listTransitionTags(gatewayOf(new FakeGateway()))).toEqual(ok([pop]));
  });
});
