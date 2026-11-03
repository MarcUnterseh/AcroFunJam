using AcroFunJam.Domain.Contribution;

namespace AcroFunJam.Application.Contribution;

/// <summary>Port (anti-corruption layer towards Identity): the contributor behind an account, from its current role.</summary>
public interface IContributors
{
    /// <returns>The contributor, or <c>null</c> when the account no longer exists.</returns>
    Task<Contributor?> Find(ContributorId id, CancellationToken ct);
}
