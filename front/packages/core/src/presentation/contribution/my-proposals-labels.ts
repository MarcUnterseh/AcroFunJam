import type { MyProposalStatus } from '../../domain/contribution/my-pose-proposal';
import { dayLabel } from '../shared-kernel/date-labels';

/**
 * Presentation: French texts of the page « Mes propositions » (story 5), shared by the web and mobile apps:
 * decisions Q19 to Q27 of the product owner and the recommendations of the ux-expert
 * (docs/design/ecrans/5-mes-propositions.md and the components it references).
 */
export const myProposalsLabels = {
  title: 'Mes propositions',
  /** Secondary link of the catalog, next to « Proposer une pose ». */
  catalogLink: 'Mes propositions',
  /** Link of the confirmation of « Proposer une pose ». */
  seeMyProposals: 'Voir mes propositions',
  signInContext: 'Connecte-toi pour accéder à tes propositions.',
  introduction: "Retrouve les poses que tu as proposées et ce qu'elles sont devenues.",
  loading: 'Chargement de tes propositions…',
  loadingFailed: 'Impossible de charger tes propositions. Vérifie ta connexion Internet, puis réessaie.',
  loadingOutdated: 'Impossible de charger tes propositions : le site doit être mis à jour. Recharge la page.',
  retry: 'Réessayer',
  retrying: 'Chargement…',
  reload: 'Recharger la page',
  emptyTitle: "Tu n'as encore proposé aucune pose.",
  emptyText: "Les poses que tu proposes apparaissent ici, avec ce qu'elles deviennent.",
  // The session expired: the page tells it itself, in a lasting block (no banner of the site).
  sessionExpiredTitle: 'Ta session a expiré.',
  sessionExpiredText: 'Connecte-toi de nouveau pour retrouver tes propositions.',
  /** Same announcement as the banner of the site. */
  sessionExpiredAnnouncement: 'Ta session a expiré. Tu peux te reconnecter.',
  signIn: 'Se connecter',
  /** Primary link of the empty page, as on the catalog. */
  proposePose: 'Proposer une pose',
  // Details of a decision, in the card (carte-ma-proposition.md); never who decided.
  /** Contributor variant of the summary « proposé → retenu » (recapitulatif-ajustements.md). */
  adjustmentsTitle: 'Ajustements apportés',
  adjustmentsRest: 'Les autres valeurs sont celles que tu as proposées.',
  message: "Message d'ajustement",
  reason: 'Motif du refus',
} as const;

/** Under the introduction: how many proposals, and their order, which is not obvious. */
export const myProposalCountLabel = (count: number): string =>
  `${count} ${count === 1 ? 'proposition' : 'propositions'}, de la plus récente à la plus ancienne`;

/** « Proposée le 3 novembre 2026 », under the name of a proposal; the day apart, for a time element. */
export const submittedLine = (submittedAt: Date): { readonly before: string; readonly day: string } => ({
  before: 'Proposée le ',
  day: dayLabel(submittedAt),
});

/**
 * The status of a proposal (docs/design/composants/statut-proposition.md): a lasting state, not an event. Its tone
 * colours the icon only; the symbol is the shape of the icon, which never relies on the colour alone.
 */
export type MyProposalStatusLabel = {
  readonly tone: 'neutral' | 'success' | 'information';
  readonly symbol: 'clock' | 'success' | 'information';
  /** Visually hidden text read before the status; null when the status cannot be read. */
  readonly prefix: string | null;
  readonly text: string;
  /**
   * The day of the decision, after the text (« Acceptée le » + « 5 novembre 2026 »), with its machine-readable
   * date for a time element; null when the status has no decision date.
   */
  readonly day: { readonly label: string; readonly dateTime: string } | null;
  /** What it means for the pose, under the status. */
  readonly consequence: string | null;
};

const statusPrefix = 'Statut : ';
const published = 'Elle est publiée dans le catalogue.';

/** « Acceptée le 5 novembre 2026 »: the date of a decision, to the day (Q21). */
const decided = (
  tone: MyProposalStatusLabel['tone'],
  text: string,
  decidedAt: Date,
  consequence: string | null,
): MyProposalStatusLabel => ({
  tone,
  symbol: tone === 'success' ? 'success' : 'information',
  prefix: statusPrefix,
  text,
  day: { label: dayLabel(decidedAt), dateTime: decidedAt.toISOString() },
  consequence,
});

/** The status of a proposal for its contributor (decision Q22), never who decided. */
export const myProposalStatusLabel = (status: MyProposalStatus): MyProposalStatusLabel => {
  switch (status.kind) {
    case 'pending':
      return {
        tone: 'neutral',
        symbol: 'clock',
        prefix: statusPrefix,
        text: 'En attente de validation',
        day: null,
        consequence: 'Elle apparaîtra dans le catalogue une fois acceptée.',
      };
    case 'accepted':
      return decided('success', 'Acceptée le ', status.decidedAt, published);
    case 'accepted-with-adjustments':
      return decided(
        'success',
        'Acceptée avec ajustements le ',
        status.decidedAt,
        'Elle est publiée dans le catalogue avec ces ajustements.',
      );
    case 'rejected':
      // A rejection is no fault of the person: information, never danger.
      return decided('information', 'Refusée le ', status.decidedAt, "Elle n'est pas publiée dans le catalogue.");
    case 'published-directly':
      return {
        tone: 'success',
        symbol: 'success',
        prefix: statusPrefix,
        text: 'Publiée directement',
        day: null,
        consequence: published,
      };
    case 'unknown':
      // Neutral, so as not to look like a rejection: the site is late, not the proposal.
      return {
        tone: 'neutral',
        symbol: 'information',
        prefix: null,
        text: 'Statut indisponible. Recharge la page.',
        day: null,
        consequence: null,
      };
  }
};
