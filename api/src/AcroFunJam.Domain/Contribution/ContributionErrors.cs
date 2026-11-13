using AcroFunJam.Domain.Common;

namespace AcroFunJam.Domain.Contribution;

/// <summary>Expected errors of the Contribution context, with stable codes (ADR 0007, ADR 0018).</summary>
public static class ContributionErrors
{
    public static readonly Error PoseNameAlreadyInCatalog =
        new("contribution.pose-name-already-in-catalog", "Une pose de ce nom existe déjà dans le catalogue.");

    public static readonly Error PoseNameAlreadyPending =
        new("contribution.pose-name-already-pending", "Une pose de ce nom est déjà en attente de validation.");

    public static readonly Error UnknownContributor =
        new("contribution.unknown-contributor", "Ce compte n'existe plus : reconnectez-vous pour proposer une pose.");

    public static readonly Error UnknownValidator =
        new("contribution.unknown-validator", "Ce compte n'existe plus : reconnectez-vous pour décider d'une proposition.");

    public static readonly Error ValidatorRequired =
        new("contribution.validator-required", "Seul un validateur ou un administrateur accepte ou refuse une proposition.");

    public static readonly Error ProposalNotFound =
        new("contribution.proposal-not-found", "Cette proposition n'existe pas.");

    public static readonly Error ProposalAlreadyDecided =
        new("contribution.proposal-already-decided", "Cette proposition a déjà été traitée.");

    public static readonly Error RejectionReasonRequired =
        new("contribution.rejection-reason-required", "Le motif de refus est obligatoire.");

    public static readonly Error RejectionReasonTooLong =
        new("contribution.rejection-reason-too-long", $"Le motif de refus ne doit pas dépasser {RejectionReason.MaxLength} caractères.");

    public static readonly Error AdjustmentNoteTooLong =
        new("contribution.adjustment-note-too-long", $"Le message d'ajustement ne doit pas dépasser {AdjustmentNote.MaxLength} caractères.");

    public static readonly Error PoseNotFound =
        new("contribution.pose-not-found", "Cette pose n'est pas dans le catalogue.");

    public static readonly Error RevisionChangesNothing =
        new("contribution.revision-changes-nothing", "La modification ne change rien à la pose.");

    public static readonly Error PoseRevisionAlreadyPending =
        new("contribution.pose-revision-already-pending", "Une modification de cette pose est déjà en attente de validation.");

    public static readonly Error RevisionMessageTooLong =
        new("contribution.revision-message-too-long", $"Le message de modification ne doit pas dépasser {RevisionMessage.MaxLength} caractères.");

    public static readonly Error PoseVersionRequired =
        new("contribution.pose-version-required", "La version de la pose lue au début de la modification est obligatoire.");

    public static readonly Error RetainedRevisionChangesNothing =
        new("contribution.retained-revision-changes-nothing", "Avec ces ajustements, la modification ne change plus rien à la pose.");

    public static readonly Error PoseChangedSinceRevisionStarted =
        new("contribution.pose-changed-since-revision-started", "Cette pose a changé depuis le début de la modification.");

    public static readonly Error AdjustmentNoteWithoutAdjustment =
        new("contribution.adjustment-note-without-adjustment", "Un message n'accompagne qu'une acceptation avec ajustements.");

    public static readonly Error FromPoseRequired =
        new("contribution.from-pose-required", "La pose de départ de la transition est obligatoire.");

    public static readonly Error ToPoseRequired =
        new("contribution.to-pose-required", "La pose d'arrivée de la transition est obligatoire.");

    public static readonly Error FromPoseNotFound =
        new("contribution.from-pose-not-found", "La pose de départ n'est pas dans le catalogue.");

    public static readonly Error ToPoseNotFound =
        new("contribution.to-pose-not-found", "La pose d'arrivée n'est pas dans le catalogue.");

    public static readonly Error TransitionNameAlreadyInCatalog =
        new("contribution.transition-name-already-in-catalog", "Une transition de ce nom relie déjà ces poses dans le catalogue.");

    public static readonly Error TransitionNameAlreadyPending =
        new("contribution.transition-name-already-pending", "Une transition de ce nom entre ces poses est déjà en attente de validation.");

    public static readonly Error UnnamedTransitionAlreadyInCatalog =
        new("contribution.unnamed-transition-already-in-catalog", "Une transition sans nom relie déjà ces poses dans le catalogue : il faut nommer la nouvelle.");

    public static readonly Error UnnamedTransitionAlreadyPending =
        new("contribution.unnamed-transition-already-pending", "Une transition sans nom entre ces poses est déjà en attente de validation : il faut nommer la nouvelle.");
}
