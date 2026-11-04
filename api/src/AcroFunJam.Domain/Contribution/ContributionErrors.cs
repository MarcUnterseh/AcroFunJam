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
}
