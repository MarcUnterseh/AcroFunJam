using AcroFunJam.Domain.Contribution;

namespace AcroFunJam.Application.Contribution;

/// <summary>
/// Port (anti-corruption layer towards Identity, ADR 0022): the e-mail addresses of contributors, read in a single
/// query. Contribution never stores them.
/// </summary>
public interface IContributorEmails
{
    /// <returns>The address of each given contributor whose account still exists; a deleted account is absent.</returns>
    Task<IReadOnlyDictionary<ContributorId, string>> Of(IReadOnlyCollection<ContributorId> contributors, CancellationToken ct);
}
