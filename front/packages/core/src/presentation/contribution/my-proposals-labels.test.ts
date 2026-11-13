import { describe, expect, it } from 'vitest';
import type { MyProposalStatus } from '../../domain/contribution/my-pose-proposal';
import type { RejectionReason } from '../../domain/contribution/rejection-reason';
import {
  myProposalCountLabel,
  myProposalsLabels,
  myProposalStatusLabel,
  myRevisionLabels,
  submittedLine,
} from './my-proposals-labels';

describe('myProposalsLabels', () => {
  it('should name the page and the links that lead to it as the scenarios read them', () => {
    expect(myProposalsLabels).toMatchObject({
      title: 'Mes propositions',
      catalogLink: 'Mes propositions',
      seeMyProposals: 'Voir mes propositions',
      signInContext: 'Connecte-toi pour accéder à tes propositions.',
      introduction:
        "Retrouve les poses et les modifications que tu as proposées, et ce qu'elles sont devenues.",
    });
  });

  it('should give the states of the page: loading, failures, no proposal yet', () => {
    expect(myProposalsLabels).toMatchObject({
      loading: 'Chargement de tes propositions…',
      loadingFailed: 'Impossible de charger tes propositions. Vérifie ta connexion Internet, puis réessaie.',
      loadingOutdated:
        'Impossible de charger tes propositions : le site doit être mis à jour. Recharge la page.',
      retry: 'Réessayer',
      retrying: 'Chargement…',
      reload: 'Recharger la page',
      emptyTitle: "Tu n'as encore proposé aucune pose.",
      emptyText: "Les poses et les modifications que tu proposes apparaissent ici, avec ce qu'elles deviennent.",
      proposePose: 'Proposer une pose',
    });
  });

  it('should tell an expired session on the page, with the announcement of the banner of the site', () => {
    expect(myProposalsLabels).toMatchObject({
      sessionExpiredTitle: 'Ta session a expiré.',
      sessionExpiredText: 'Connecte-toi de nouveau pour retrouver tes propositions.',
      sessionExpiredAnnouncement: 'Ta session a expiré. Tu peux te reconnecter.',
      signIn: 'Se connecter',
    });
  });
});

describe('myProposalsLabels of a card', () => {
  it('should name the details of a decision: the adjustments, the adjustment note and the rejection reason', () => {
    expect(myProposalsLabels).toMatchObject({
      adjustmentsTitle: 'Ajustements apportés',
      adjustmentsRest: 'Les autres valeurs sont celles que tu as proposées.',
      message: "Message d'ajustement",
      reason: 'Motif du refus',
    });
  });
});

describe('myProposalCountLabel', () => {
  it('should state the order of the list when there are several proposals', () => {
    expect(myProposalCountLabel(4)).toBe('4 propositions, de la plus récente à la plus ancienne');
  });

  it('should use the singular when there is a single proposal', () => {
    expect(myProposalCountLabel(1)).toBe('1 proposition, de la plus récente à la plus ancienne');
  });
});

describe('submittedLine', () => {
  // The day apart: the apps put it in a time element.
  it('should date the submission to the day, without time', () => {
    expect(submittedLine(new Date('2026-11-03T09:00:00Z'))).toEqual({
      before: 'Proposée le ',
      day: '3 novembre 2026',
    });
  });
});

describe('myProposalStatusLabel', () => {
  it('should say a pending proposal awaits validation, neutral, and when it will appear in the catalog', () => {
    expect(myProposalStatusLabel({ kind: 'pending' })).toEqual({
      tone: 'neutral',
      symbol: 'clock',
      prefix: 'Statut : ',
      text: 'En attente de validation',
      day: null,
      consequence: 'Elle apparaîtra dans le catalogue une fois acceptée.',
    });
  });

  const decidedAt = new Date('2026-11-05T09:00:00Z');

  it('should say an accepted proposal is accepted on the day of the decision and published in the catalog', () => {
    expect(myProposalStatusLabel({ kind: 'accepted', decidedAt })).toEqual({
      tone: 'success',
      symbol: 'success',
      prefix: 'Statut : ',
      text: 'Acceptée le ',
      day: { label: '5 novembre 2026', dateTime: '2026-11-05T09:00:00.000Z' },
      consequence: 'Elle est publiée dans le catalogue.',
    });
  });

  it('should say a proposal accepted with adjustments is published with these adjustments', () => {
    const status = myProposalStatusLabel({
      kind: 'accepted-with-adjustments',
      decidedAt,
      adjustments: [{ field: 'flyerDifficulty', proposed: 'intermediate', retained: 'discovery' }],
      message: null,
    });

    expect(status).toEqual({
      tone: 'success',
      symbol: 'success',
      prefix: 'Statut : ',
      text: 'Acceptée avec ajustements le ',
      day: { label: '5 novembre 2026', dateTime: '2026-11-05T09:00:00.000Z' },
      consequence: 'Elle est publiée dans le catalogue avec ces ajustements.',
    });
  });

  // A rejection is no fault of the person: information, never danger; the reason follows in the card.
  it('should say a rejected proposal is rejected on the day of the decision, not published, in the information tone', () => {
    const reason = 'Doublon de Bird, déjà au catalogue.' as RejectionReason;

    expect(myProposalStatusLabel({ kind: 'rejected', decidedAt, reason })).toEqual({
      tone: 'information',
      symbol: 'information',
      prefix: 'Statut : ',
      text: 'Refusée le ',
      day: { label: '5 novembre 2026', dateTime: '2026-11-05T09:00:00.000Z' },
      consequence: "Elle n'est pas publiée dans le catalogue.",
    });
  });

  it('should say a pose published directly is published in the catalog, without a decision date', () => {
    expect(myProposalStatusLabel({ kind: 'published-directly' })).toEqual({
      tone: 'success',
      symbol: 'success',
      prefix: 'Statut : ',
      text: 'Publiée directement',
      day: null,
      consequence: 'Elle est publiée dans le catalogue.',
    });
  });

  // An API newer than the site: neutral, so as not to look like a rejection; the site is late, not the proposal.
  it('should ask to reload the page, without « Statut : », when the status cannot be read', () => {
    expect(myProposalStatusLabel({ kind: 'unknown' })).toEqual({
      tone: 'neutral',
      symbol: 'information',
      prefix: null,
      text: 'Statut indisponible. Recharge la page.',
      day: null,
      consequence: null,
    });
  });
});

describe('myProposalStatusLabel of a revision (story 6)', () => {
  const decidedAt = new Date('2026-11-13T10:00:00Z');

  it.each([
    [{ kind: 'pending' }, 'La pose changera dans le catalogue une fois la modification acceptée.'],
    [{ kind: 'accepted', decidedAt }, 'La pose est modifiée dans le catalogue.'],
    [{ kind: 'published-directly' }, 'La pose est modifiée dans le catalogue.'],
    [
      { kind: 'accepted-with-adjustments', decidedAt, adjustments: [], message: null },
      'La pose est modifiée dans le catalogue avec ces ajustements.',
    ],
    [{ kind: 'rejected', decidedAt, reason: 'Non.' }, 'La pose reste inchangée dans le catalogue.'],
  ] as const)('should say what the status %o means for the pose: "%s"', (status, consequence) => {
    expect(myProposalStatusLabel(status as MyProposalStatus, 'pose-revision').consequence).toBe(consequence);
  });

  it('should keep the words of the status of a pose proposal', () => {
    expect(myProposalStatusLabel({ kind: 'accepted', decidedAt }, 'pose-revision').text).toBe('Acceptée le ');
  });
});

describe('myRevisionLabels', () => {
  it('should present a revision as the card « ma modification » specifies it', () => {
    expect(myRevisionLabels).toEqual({
      titlePrefix: 'Modification de ',
      changesTitle: 'Ce qui change dans la pose',
      proposedKey: "Valeur d'avant → valeur proposée",
      retainedKey: "Valeur d'avant → valeur retenue",
      before: 'Avant : ',
      proposed: ', proposé : ',
      retained: ', retenu : ',
    });
  });
});
