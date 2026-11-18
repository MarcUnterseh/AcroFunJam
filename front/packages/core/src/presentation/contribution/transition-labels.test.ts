import { describe, expect, it } from 'vitest';
import type { TransitionAdjustment } from '../../domain/contribution/transition-adjustment';
import type { TransitionDescription } from '../../domain/shared-kernel/transition-description';
import type { TransitionName } from '../../domain/shared-kernel/transition-name';
import { myProposalStatusLabel } from './my-proposals-labels';
import {
  descriptionCounterLabel,
  proposedTransitionValueLabel,
  transitionAdjustmentLine,
  transitionCardTitle,
  transitionDecisionReport,
  transitionFieldErrorLabel,
  transitionNameHelp,
  newTransitionFormAnnouncement,
  transitionSuccessDocumentTitle,
  transitionPlaceTakenLabel,
  transitionProposalLabels,
  transitionProposalSuccess,
  transitionSuccessActions,
} from './transition-labels';
import { decisionFailureLabel } from './validation-labels';

const star = { id: 'pose-star', name: 'Star' };
const throne = { id: 'pose-throne', name: 'Throne' };
const bird = { id: 'pose-bird', name: 'Bird' };

describe('transitionProposalLabels', () => {
  it('should name the form and its fields, in the order of the form, the optional ones marked', () => {
    expect(transitionProposalLabels).toMatchObject({
      title: 'Proposer une transition',
      signInContext: 'Connecte-toi pour proposer une transition.',
      fromPose: 'Pose de départ',
      toPose: "Pose d'arrivée",
      choosePose: 'Choisis une pose',
      name: 'Nom de la transition (facultatif)',
      baseDifficulty: 'Difficulté base',
      flyerDifficulty: 'Difficulté flyer',
      description: 'Description (facultative)',
      submit: 'Proposer la transition',
      cancel: 'Annuler',
    });
  });

  it('should tell the difficulties measure the passage alone, the poses being mastered', () => {
    expect(transitionProposalLabels.difficultyHelp).toBe(
      'La difficulté mesure le passage seul : les deux poses sont supposées maîtrisées.',
    );
  });

  it('should announce to a validator that the transition is published as soon as it is sent', () => {
    expect(transitionProposalLabels.publishesDirectly).toBe(
      "Ton rôle te permet de publier directement : la transition apparaîtra dans le catalogue dès l'envoi.",
    );
  });

  it('should tell a departure pose that is no longer in the catalog', () => {
    expect(transitionProposalLabels.notFound).toBe("Cette pose n'est plus dans le catalogue.");
  });
});

describe('transitionFieldErrorLabel', () => {
  it.each([
    ['contribution.from-pose-required', 'Choisis la pose de départ.'],
    ['contribution.to-pose-required', "Choisis la pose d'arrivée."],
    ['transition.name-without-letter-or-digit', 'Le nom doit contenir au moins une lettre ou un chiffre.'],
    ['pose.base-difficulty-required', 'Choisis la difficulté base.'],
    ['pose.flyer-difficulty-required', 'Choisis la difficulté flyer.'],
  ] as const)('should tell what to do for %s', (code, label) => {
    expect(transitionFieldErrorLabel(code, { nameLength: 0, descriptionLength: 0 })).toBe(label);
  });

  it('should state the length of a name or a description too long', () => {
    const lengths = { nameLength: 61, descriptionLength: 501 };

    expect(transitionFieldErrorLabel('transition.name-too-long', lengths)).toBe(
      'Le nom ne doit pas dépasser 60 caractères (il en compte 61).',
    );
    expect(transitionFieldErrorLabel('transition.description-too-long', lengths)).toBe(
      'La description ne doit pas dépasser 500 caractères (elle en compte 501).',
    );
  });
});

describe('transitionPlaceTakenLabel', () => {
  it('should tell, under the name, that a transition of this name already links these poses', () => {
    expect(
      transitionPlaceTakenLabel('transition-name-already-in-catalog', { from: 'Star', to: 'Star' }),
    ).toBe('Une transition de ce nom va déjà de Star vers Star dans le catalogue. Choisis un autre nom.');
  });

  it('should tell, under the name, that a transition without a name already links these poses: name yours', () => {
    expect(
      transitionPlaceTakenLabel('unnamed-transition-already-in-catalog', { from: 'Throne', to: 'Bird' }),
    ).toBe('Une transition sans nom va déjà de Throne vers Bird. Donne un nom à la tienne pour la distinguer.');
  });

  it('should tell the same of a transition pending validation', () => {
    expect(transitionPlaceTakenLabel('transition-name-already-pending', { from: 'Star', to: 'Star' })).toBe(
      "Une transition de ce nom va déjà de Star vers Star et attend d'être validée. Choisis un autre nom.",
    );
    expect(
      transitionPlaceTakenLabel('unnamed-transition-already-pending', { from: 'Throne', to: 'Bird' }),
    ).toBe(
      "Une transition sans nom va déjà de Throne vers Bird et attend d'être validée. Donne un nom à la tienne pour la distinguer.",
    );
  });
});

describe('transitionProposalSuccess', () => {
  it('should confirm to a user that the transition is sent and waits for a validation', () => {
    expect(
      transitionProposalSuccess({ status: 'pending', fromPose: throne, toPose: bird, name: null }),
    ).toEqual({
      title: 'Merci, ta transition est envoyée.',
      text: "La transition de Throne vers Bird est en attente de validation. Elle apparaîtra sur la page des deux poses quand un validateur l'aura acceptée.",
    });
  });

  it('should confirm to a validator that the named transition is published', () => {
    expect(
      transitionProposalSuccess({ status: 'published', fromPose: star, toPose: star, name: 'Ninja Star' }),
    ).toEqual({
      title: 'La transition « Ninja Star » de Star vers Star est publiée.',
      text: 'Elle apparaît maintenant sur la page des deux poses.',
    });
  });

  it('should promise nothing when the status cannot be read', () => {
    expect(
      transitionProposalSuccess({ status: 'received', fromPose: throne, toPose: bird, name: null }),
    ).toEqual({
      title: 'Ta transition est envoyée.',
      text: null,
    });
  });
});

describe('transitionSuccessActions', () => {
  it('should offer a user to see their proposals, to propose another transition, or to go back to the pose', () => {
    expect(transitionSuccessActions('pending', 'Throne')).toEqual([
      { action: 'see-my-proposals', label: 'Voir mes propositions' },
      { action: 'propose-another', label: 'Proposer une autre transition depuis Throne' },
      { action: 'see-pose', label: 'Revenir à Throne' },
    ]);
  });

  it('should offer a validator to see the pose, or to propose another transition', () => {
    expect(transitionSuccessActions('published', 'Star')).toEqual([
      { action: 'see-pose', label: 'Voir la pose Star' },
      { action: 'propose-another', label: 'Proposer une autre transition depuis Star' },
    ]);
  });
});

describe('transitionCardTitle', () => {
  it('should title a named transition « Transition Ninja Star de Star vers Star », the names emphasised', () => {
    expect(transitionCardTitle({ name: 'Ninja Star', from: 'Star', to: 'Star' })).toEqual([
      { text: 'Transition ', emphasised: false },
      { text: 'Ninja Star', emphasised: true },
      { text: ' de ', emphasised: false },
      { text: 'Star', emphasised: true },
      { text: ' vers ', emphasised: false },
      { text: 'Star', emphasised: true },
    ]);
  });

  it('should title a transition without a name « Transition de Throne vers Bird »', () => {
    expect(
      transitionCardTitle({ name: null, from: 'Throne', to: 'Bird' })
        .map((part) => part.text)
        .join(''),
    ).toBe('Transition de Throne vers Bird');
  });
});

describe('descriptionCounterLabel', () => {
  it('should appear near the limit only', () => {
    expect(descriptionCounterLabel(449)).toBeNull();
    expect(descriptionCounterLabel(450)).toBe('450 / 500 caractères');
    expect(descriptionCounterLabel(502)).toBe('502 / 500 caractères : 2 de trop');
  });
});

describe('transitionAdjustmentLine', () => {
  it.each<[TransitionAdjustment, { term: string; proposed: string; retained: string }]>([
    [
      { field: 'name', proposed: null, retained: 'Ninja Star' as TransitionName },
      { term: 'Nom de la transition', proposed: 'aucun nom', retained: 'Ninja Star' },
    ],
    [
      { field: 'flyerDifficulty', proposed: 'intermediate', retained: 'advanced' },
      { term: 'Difficulté flyer', proposed: 'Intermédiaire', retained: 'Avancé' },
    ],
    [
      {
        field: 'tags',
        proposed: [],
        retained: [
          { id: 'tag-dynamique', name: 'dynamique' },
          { id: 'tag-pop', name: 'pop' },
        ],
      },
      { term: 'Étiquettes', proposed: 'aucune', retained: 'dynamique, pop' },
    ],
    [
      { field: 'description', proposed: 'Vidéo' as TransitionDescription, retained: null },
      { term: 'Description', proposed: 'Vidéo', retained: 'aucune description' },
    ],
  ])('should present the adjustment %o as displayed', (adjustment, line) => {
    expect(transitionAdjustmentLine(adjustment)).toEqual(line);
  });
});

describe('proposedTransitionValueLabel', () => {
  it('should remind the proposed value under each field of the adjustment zone', () => {
    expect(proposedTransitionValueLabel({ field: 'name', value: null })).toBe('Proposé : aucun nom');
    expect(proposedTransitionValueLabel({ field: 'baseDifficulty', value: 'advanced' })).toBe(
      'Proposée : Avancé',
    );
    expect(proposedTransitionValueLabel({ field: 'description', value: null })).toBe(
      'Proposée : aucune description',
    );
  });
});

describe('transitionDecisionReport', () => {
  it('should tell the validator the accepted transition is published', () => {
    expect(
      transitionDecisionReport({
        decision: 'accepted',
        transition: { name: 'Ninja Star', from: 'Star', to: 'Star' },
        adjusted: false,
      }),
    ).toEqual({
      title: 'La transition « Ninja Star » de Star vers Star est publiée dans le catalogue.',
      text: null,
    });
  });

  it('should tell the adjustments, and present a transition without a name by its poses', () => {
    expect(
      transitionDecisionReport({
        decision: 'accepted',
        transition: { name: null, from: 'Throne', to: 'Bird' },
        adjusted: true,
      }).title,
    ).toBe('La transition de Throne vers Bird est publiée dans le catalogue avec tes ajustements.');
  });

  it('should tell the transition is rejected, the contributor seeing the reason', () => {
    expect(
      transitionDecisionReport({
        decision: 'rejected',
        transition: { name: null, from: 'Throne', to: 'Star' },
      }),
    ).toEqual({
      title: 'La proposition de la transition de Throne vers Star est refusée.',
      text: 'Le contributeur verra ton motif.',
    });
  });
});

describe('decisionFailureLabel of a transition', () => {
  it('should tell that a transition of this name was published meanwhile between these poses', () => {
    expect(decisionFailureLabel('transition-name-already-in-catalog')).toBe(
      "Une transition de ce nom relie déjà ces poses dans le catalogue. Ajuste le nom avant de publier, ou refuse la proposition si c'est un doublon.",
    );
  });

  it('should tell that a pose of the transition left the catalog, the transition to be rejected', () => {
    expect(decisionFailureLabel('transition-pose-not-found')).toBe(
      "Une des poses de cette transition n'est plus dans le catalogue : la transition ne peut pas être publiée. Refuse la proposition.",
    );
  });

  it('should tell that a retained tag left the list of tags meanwhile (story 8)', () => {
    expect(decisionFailureLabel('tags-not-in-list')).toBe(
      'Une étiquette retenue ne fait plus partie de la liste des étiquettes. Vérifie les étiquettes, puis publie de nouveau.',
    );
  });

  it('should tell that a transition without a name already links these poses', () => {
    expect(decisionFailureLabel('unnamed-transition-already-in-catalog')).toBe(
      "Une transition sans nom relie déjà ces poses dans le catalogue. Donne un nom à celle-ci avant de la publier, ou refuse-la si c'est un doublon.",
    );
  });
});

describe('myProposalStatusLabel of a transition', () => {
  it('should tell what the status means for the transition', () => {
    expect(myProposalStatusLabel({ kind: 'pending' }, 'transition-proposal').consequence).toBe(
      'La transition apparaîtra dans le catalogue une fois acceptée.',
    );
    expect(myProposalStatusLabel({ kind: 'published-directly' }, 'transition-proposal').consequence).toBe(
      'Elle est publiée dans le catalogue.',
    );
  });
});

describe('transitionNameHelp', () => {
  it('should give as example the poses chosen, the transition without a name presented by them', () => {
    expect(transitionNameHelp({ from: 'Star', to: 'Bird' })).toBe(
      "Son nom d'usage, par exemple Ninja Star. Sans nom, elle se présentera par ses poses : Star → Bird. 60 caractères au maximum.",
    );
  });

  it('should give « Throne → Bird » as example while a pose is not chosen', () => {
    expect(transitionNameHelp({ from: 'Star', to: null })).toContain('par ses poses : Throne → Bird.');
  });
});

describe('after sending, the next transition', () => {
  it('should announce a blank form, from the pose of origin', () => {
    expect(newTransitionFormAnnouncement('Throne')).toBe('Nouveau formulaire : la pose de départ est Throne.');
  });

  it('should title the document after the sending, from the status returned by the API', () => {
    expect(transitionSuccessDocumentTitle('pending')).toBe('Transition envoyée');
    expect(transitionSuccessDocumentTitle('received')).toBe('Transition envoyée');
    expect(transitionSuccessDocumentTitle('published')).toBe('Transition publiée');
  });
});
