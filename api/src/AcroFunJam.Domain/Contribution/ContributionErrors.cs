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
}
