import { describe, expect, it } from 'vitest';
import type { PoseAdjustment } from '../../domain/contribution/pose-adjustment';
import type { PoseValueChange } from '../../domain/contribution/pose-revision';
import {
  adjustedNameRefusalLabel,
  adjustmentLine,
  contributorLine,
  currentValueLabel,
  decisionFailureLabel,
  decisionLabelsOf,
  decisionReport,
  pendingBadge,
  pendingCountLabel,
  pendingCountSuffix,
  proposedValueLabel,
  validationLabels,
  revisionCardLabels,
  validationLinkName,
  validatorTextCounterLabel,
  validatorTextErrorLabel,
  valueChangeLine,
} from './validation-labels';

describe('validationLabels', () => {
  it('should invite a visitor to sign in to reach the proposals to validate', () => {
    expect(validationLabels.signInContext).toBe('Connecte-toi pour accéder aux propositions à valider.');
  });

  it('should ask to reload the page when the queue cannot be loaded by an outdated site', () => {
    expect(validationLabels.loadingOutdated).toBe(
      'Impossible de charger les propositions : le site doit être mis à jour. Recharge la page.',
    );
  });

  it('should tell a kept input was for a proposal decided meanwhile', () => {
    expect(validationLabels.keptInputDecided).toBe(
      'Une proposition sur laquelle tu avais commencé une décision a été traitée entre-temps.',
    );
  });

  it('should tell every proposal of the list is decided', () => {
    expect(validationLabels.allDecided).toBe('Toutes les propositions de la liste sont traitées.');
  });
});

describe('validationLinkName', () => {
  it('should state the number of pending proposals in the name of the header link', () => {
    expect(validationLinkName(3)).toBe('Propositions à valider (3 en attente)');
  });

  it.each([0, null])('should state no number when the count is %s (none pending, or unknown)', (count) => {
    expect(validationLinkName(count)).toBe('Propositions à valider');
  });

  it('should say "plus de 99" when more than 99 proposals are pending', () => {
    expect(validationLinkName(100)).toBe('Propositions à valider (plus de 99 en attente)');
  });
});

describe('pendingBadge', () => {
  it.each([
    [null, null],
    [0, null],
    [1, '1'],
    [99, '99'],
    [100, '99+'],
  ])('should show %s pending proposals as %s', (count, badge) => {
    expect(pendingBadge(count)).toBe(badge);
  });
});

describe('pendingCountLabel', () => {
  it('should state the order of the queue when several proposals are pending', () => {
    expect(pendingCountLabel(3)).toBe('3 propositions en attente, de la plus ancienne à la plus récente');
  });

  it('should use the singular, without the order, when a single proposal is pending', () => {
    expect(pendingCountLabel(1)).toBe('1 proposition en attente');
  });

  it('should say every proposal of the list is decided when none is left pending', () => {
    expect(pendingCountLabel(0)).toBe('Toutes les propositions de la liste sont traitées.');
  });
});

describe('pendingCountSuffix', () => {
  it('should give the rest of the name of the header link, after its title', () => {
    expect(pendingCountSuffix(3)).toBe('(3 en attente)');
    expect(pendingCountSuffix(120)).toBe('(plus de 99 en attente)');
  });

  it.each([0, null])('should give nothing when the count is %s', (count) => {
    expect(pendingCountSuffix(count)).toBe('');
  });
});

describe('contributorLine', () => {
  const submittedAt = new Date('2026-11-03T09:00:00Z');

  it('should present the contributor by their address, with the date of submission', () => {
    expect(contributorLine({ email: 'alice@example.org', isYou: false }, submittedAt)).toEqual({
      before: 'Proposée par ',
      contributor: 'alice@example.org',
      after: ' le 3 novembre 2026',
    });
  });

  it('should present the proposal of the validator as theirs ("toi")', () => {
    expect(contributorLine({ email: 'alice@example.org', isYou: true }, submittedAt).contributor).toBe('toi');
  });

  it('should say the account was deleted when the contributor no longer has an address', () => {
    expect(contributorLine({ email: null, isYou: false }, submittedAt).contributor).toBe(
      'un compte supprimé',
    );
  });

  it('should date the submission in the time zone of Paris', () => {
    expect(contributorLine({ email: null, isYou: false }, new Date('2026-11-03T23:30:00Z')).after).toBe(
      ' le 4 novembre 2026',
    );
  });
});

describe('decisionReport', () => {
  it('should say the pose is published in the catalog when it is accepted as proposed', () => {
    expect(
      decisionReport({ proposal: 'pose-proposal', decision: 'accepted', name: 'Throne', adjusted: false }),
    ).toEqual({
      title: 'La pose « Throne » est publiée dans le catalogue.',
      text: null,
    });
  });

  it('should say the pose is published with the adjustments of the validator when it was adjusted', () => {
    expect(
      decisionReport({ proposal: 'pose-proposal', decision: 'accepted', name: 'Throne', adjusted: true })
        .title,
    ).toBe('La pose « Throne » est publiée dans le catalogue avec tes ajustements.');
  });

  it('should say the proposal is rejected and that its contributor will see the reason', () => {
    expect(decisionReport({ proposal: 'pose-proposal', decision: 'rejected', name: 'Front Bird' })).toEqual({
      title: 'La proposition « Front Bird » est refusée.',
      text: 'Le contributeur verra ton motif.',
    });
  });
});

describe('decisionReport of a revision (story 6)', () => {
  it('should say the pose is modified in the catalog when the revision is accepted', () => {
    expect(
      decisionReport({ proposal: 'pose-revision', decision: 'accepted', name: 'Throne', adjusted: false }),
    ).toEqual({ title: 'La pose « Throne » est modifiée dans le catalogue.', text: null });
  });

  it('should say the pose is modified with the adjustments of the validator when it was adjusted', () => {
    expect(
      decisionReport({ proposal: 'pose-revision', decision: 'accepted', name: 'Throne', adjusted: true })
        .title,
    ).toBe('La pose « Throne » est modifiée dans le catalogue avec tes ajustements.');
  });

  it('should say the revision is rejected and that its contributor will see the reason', () => {
    expect(decisionReport({ proposal: 'pose-revision', decision: 'rejected', name: 'Throne' })).toEqual({
      title: 'La modification de « Throne » est refusée.',
      text: 'Le contributeur verra ton motif.',
    });
  });
});

describe('decisionLabelsOf', () => {
  it('should name the decisions on a pose proposal as in story 4', () => {
    expect(decisionLabelsOf('pose-proposal')).toEqual({
      accept: 'Accepter et publier',
      adjust: 'Ajuster avant de publier',
      adjustTitle: 'Ajuster avant de publier',
      publishAdjusted: 'Publier avec ces ajustements',
      nothingAdjusted: "Tu n'as rien modifié. Tu peux accepter la proposition telle quelle.",
    });
  });

  it('should name the decisions on a revision as the screen of story 6 specifies them', () => {
    expect(decisionLabelsOf('pose-revision')).toEqual({
      accept: 'Accepter la modification',
      adjust: "Ajuster avant d'accepter",
      adjustTitle: "Ajuster avant d'accepter",
      publishAdjusted: 'Accepter avec ces ajustements',
      nothingAdjusted: "Tu n'as rien modifié. Tu peux accepter la modification telle quelle.",
    });
  });
});

describe('decisionFailureLabel', () => {
  it.each([
    [
      'unreachable',
      "Ta décision n'a pas pu être envoyée : impossible de joindre AcroFunJam. Vérifie ta connexion Internet, puis réessaie.",
    ],
    ['session-expired', 'Ta session a expiré. Connecte-toi de nouveau pour envoyer ta décision.'],
    [
      'outdated',
      "Ta décision n'a pas pu être envoyée : le site doit être mis à jour. Recharge la page, puis réessaie.",
    ],
    ['already-decided', 'Cette proposition a déjà été traitée.'],
    ['not-found', "Cette proposition n'est plus en attente de validation."],
    ['role-withdrawn', 'Tu ne peux plus accepter ni refuser de proposition : ton rôle a changé.'],
    [
      'name-already-in-catalog',
      "Une pose de ce nom existe déjà dans le catalogue. Ajuste le nom avant de publier, ou refuse la proposition si c'est un doublon.",
    ],
    [
      'name-already-pending',
      "Une autre proposition de ce nom attend d'être validée. Ajuste le nom avant de publier, ou refuse la proposition si c'est un doublon.",
    ],
    [
      'retained-revision-changes-nothing',
      'Avec ces ajustements, la pose ne changerait pas. Modifie tes ajustements, ou refuse la modification.',
    ],
    [
      'pose-changed',
      'Cette pose a changé depuis que la modification a été proposée. Recharge la page pour voir ses valeurs actuelles.',
    ],
  ] as const)('should explain "%s" as "%s"', (kind, label) => {
    expect(decisionFailureLabel(kind)).toBe(label);
  });

  it.each([
    [
      'unreachable',
      "Ta décision n'a pas pu être envoyée : impossible de joindre AcroFunJam. Vérifie ta connexion Internet, puis réessaie. Ta saisie est conservée.",
    ],
    [
      'session-expired',
      'Ta session a expiré. Connecte-toi de nouveau pour envoyer ta décision : ta saisie est conservée.',
    ],
    [
      'outdated',
      "Ta décision n'a pas pu être envoyée : le site doit être mis à jour. Recharge la page, puis réessaie. Ta saisie est conservée.",
    ],
  ] as const)('should say the input is kept when "%s" comes with an input (an open zone)', (kind, label) => {
    expect(decisionFailureLabel(kind, { inputKept: true })).toBe(label);
  });
});

describe('validatorTextErrorLabel', () => {
  it('should ask for the reason when the reason is missing', () => {
    expect(validatorTextErrorLabel('contribution.rejection-reason-required', 0)).toBe(
      'Saisis le motif du refus.',
    );
  });

  it('should give the length of the reason when it is too long', () => {
    expect(validatorTextErrorLabel('contribution.rejection-reason-too-long', 512)).toBe(
      'Le motif ne doit pas dépasser 500 caractères (il en compte 512).',
    );
  });

  it('should give the length of the message when it is too long', () => {
    expect(validatorTextErrorLabel('contribution.adjustment-note-too-long', 501)).toBe(
      'Le message ne doit pas dépasser 500 caractères (il en compte 501).',
    );
  });
});

describe('adjustedNameRefusalLabel', () => {
  it.each([
    ['name-already-in-catalog', 'Une pose de ce nom existe déjà dans le catalogue. Choisis un autre nom.'],
    ['name-already-pending', "Une autre proposition de ce nom attend d'être validée. Choisis un autre nom."],
  ] as const)('should explain under the adjusted name that %s', (kind, label) => {
    expect(adjustedNameRefusalLabel(kind)).toBe(label);
  });
});

describe('validatorTextCounterLabel', () => {
  it('should not show the counter when the text is far from the limit (under 450 characters)', () => {
    expect(validatorTextCounterLabel(449)).toBeNull();
  });

  it.each([450, 462, 500])('should show "%i / 500 caractères" when the text is near the limit', (length) => {
    expect(validatorTextCounterLabel(length)).toBe(`${length} / 500 caractères`);
  });

  it('should tell how many characters are too many when the text is over the limit', () => {
    expect(validatorTextCounterLabel(503)).toBe('503 / 500 caractères : 3 de trop');
  });
});

describe('proposedValueLabel', () => {
  it.each([
    [{ field: 'name', value: 'Thron' }, 'Proposé : Thron'],
    [{ field: 'baseDifficulty', value: 'beginner' }, 'Proposée : Débutant'],
    [{ field: 'flyerDifficulty', value: 'intermediate' }, 'Proposée : Intermédiaire'],
    [{ field: 'canStartFlow', value: true }, 'Proposé : Oui'],
    [{ field: 'canEndFlow', value: false }, 'Proposé : Non'],
  ] as const)('should remind the proposed value %o as "%s"', (proposed, label) => {
    expect(proposedValueLabel(proposed)).toBe(label);
  });
});

describe('currentValueLabel', () => {
  it.each([
    [{ field: 'name', value: 'Throne' }, 'Actuellement : Throne'],
    [{ field: 'baseDifficulty', value: 'beginner' }, 'Actuellement : Débutant'],
    [{ field: 'canEndFlow', value: false }, 'Actuellement : Non'],
  ] as const)('should remind the current value %o as "%s"', (current, label) => {
    expect(currentValueLabel(current)).toBe(label);
  });
});

describe('valueChangeLine', () => {
  it.each([
    [
      { field: 'name', before: 'Thron', after: 'Throne' },
      { term: 'Nom de la pose', before: 'Thron', after: 'Throne' },
    ],
    [
      { field: 'flyerDifficulty', before: 'intermediate', after: 'discovery' },
      { term: 'Difficulté flyer', before: 'Intermédiaire', after: 'Découverte' },
    ],
    [
      { field: 'canStartFlow', before: false, after: true },
      { term: 'Peut commencer un flow', before: 'Non', after: 'Oui' },
    ],
  ] as const)('should present the change %o in a summary « avant → après »', (change, line) => {
    expect(valueChangeLine(change as PoseValueChange)).toEqual(line);
  });
});

describe('adjustmentLine', () => {
  it.each([
    [
      { field: 'name', proposed: 'Thron', retained: 'Throne' },
      { term: 'Nom de la pose', proposed: 'Thron', retained: 'Throne' },
    ],
    [
      { field: 'flyerDifficulty', proposed: 'intermediate', retained: 'discovery' },
      { term: 'Difficulté flyer', proposed: 'Intermédiaire', retained: 'Découverte' },
    ],
    [
      { field: 'canEndFlow', proposed: true, retained: false },
      { term: 'Peut terminer un flow', proposed: 'Oui', retained: 'Non' },
    ],
  ] as const)('should present the adjustment %o in the summary « proposé → retenu »', (adjustment, line) => {
    expect(adjustmentLine(adjustment as PoseAdjustment)).toEqual(line);
  });
});

describe('validationLabels', () => {
  it('should name the header link and the page as the scenarios read them, with a short label for small screens', () => {
    expect(validationLabels).toMatchObject({
      navigation: 'Contribution',
      title: 'Propositions à valider',
      shortTitle: 'À valider',
      introduction:
        "Vérifie chaque proposition de pose, de modification ou de transition : accepte-la, ajuste-la avant de l'accepter ou refuse-la.",
    });
  });

  it('should name the decisions in the order of the card, from « as proposed » to « no »', () => {
    expect([validationLabels.accept, validationLabels.adjust, validationLabels.reject]).toEqual([
      'Accepter et publier',
      'Ajuster avant de publier',
      'Refuser',
    ]);
  });

  it('should name the zones of the card, their fields and their buttons as the screen specifies them', () => {
    expect(validationLabels).toMatchObject({
      reason: 'Motif du refus',
      reasonHelp: 'Le contributeur verra ce motif. 500 caractères au maximum.',
      confirmRejection: 'Confirmer le refus',
      rejecting: 'Refus en cours…',
      cancel: 'Annuler',
      adjustTitle: 'Ajuster avant de publier',
      adjustIntroduction: 'Les valeurs proposées sont préremplies.',
      checkAdjustments: 'Vérifier les ajustements',
      summaryTitle: 'Vérifie tes ajustements',
      summaryKey: 'Valeur proposée → valeur retenue',
      summaryRest: 'Les autres valeurs restent celles proposées.',
      note: 'Message pour le contributeur (facultatif)',
      noteHelp: 'Il le verra avec tes ajustements. 500 caractères au maximum.',
      publishAdjusted: 'Publier avec ces ajustements',
      editAdjustments: 'Modifier les ajustements',
      publishing: 'Publication…',
    });
  });

  it('should tell the validator who changed nothing that the proposal can be accepted as proposed', () => {
    expect(validationLabels.nothingAdjusted).toBe(
      "Tu n'as rien modifié. Tu peux accepter la proposition telle quelle.",
    );
  });

  it('should give the states of the page: loading, failure, empty queue', () => {
    expect(validationLabels).toMatchObject({
      loading: 'Chargement des propositions…',
      loadingFailed: 'Impossible de charger les propositions. Vérifie ta connexion Internet, puis réessaie.',
      emptyTitle: "Aucune proposition n'est en attente de validation.",
      emptyText: 'Tu es à jour.',
      seeCatalog: 'Voir le catalogue',
      backToCatalog: 'Revenir au catalogue',
    });
  });

  it('should announce the input given back after signing in again, the decision still to be sent', () => {
    expect(validationLabels.inputRestored).toBe('Ta saisie a été restaurée. Tu peux envoyer ta décision.');
  });
});

describe('revisionCardLabels', () => {
  it('should present a revision as the card of story 6 specifies it', () => {
    expect(revisionCardLabels).toEqual({
      titlePrefix: 'Modification de ',
      changesTitle: 'Ce qui change dans la pose',
      changesKey: 'Valeur actuelle → valeur proposée',
      before: 'Actuellement : ',
      after: ', proposé : ',
      message: 'Message de modification',
      revisedPose: 'La pose après modification',
    });
  });
});
