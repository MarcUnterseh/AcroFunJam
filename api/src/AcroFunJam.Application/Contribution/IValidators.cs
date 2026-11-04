using AcroFunJam.Domain.Contribution;

namespace AcroFunJam.Application.Contribution;

/// <summary>
/// Port (anti-corruption layer towards Identity, ADR 0022): the person deciding on a proposal, from the current role
/// of their account.
/// </summary>
public interface IValidators
{
    /// <returns>The validator, or <c>null</c> when the account no longer exists.</returns>
    Task<Validator?> Find(ValidatorId id, CancellationToken ct);
}
