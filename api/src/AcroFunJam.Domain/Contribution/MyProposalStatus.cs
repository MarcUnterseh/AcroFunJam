namespace AcroFunJam.Domain.Contribution;

/// <summary>
/// Where one of their proposals stands, for its contributor (story 5, ADR 0023): finer than <see cref="ProposalStatus"/>,
/// which stays the status of the validation queue.
/// </summary>
public enum MyProposalStatus
{
    /// <summary>En attente de validation.</summary>
    Pending,

    /// <summary>Acceptée, sans ajustement : publiée telle que proposée.</summary>
    Accepted,

    /// <summary>Acceptée avec ajustements : publiée avec les valeurs retenues par le validateur.</summary>
    AcceptedWithAdjustments,

    /// <summary>Refusée, avec un motif.</summary>
    Rejected,

    /// <summary>Publiée directement : proposée par un validateur ou un administrateur (story 3).</summary>
    PublishedDirectly,
}
