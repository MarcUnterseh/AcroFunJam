using AcroFunJam.Application.Common;
using AcroFunJam.Application.Contribution;
using AcroFunJam.Application.Identity.GetMyAccount;
using AcroFunJam.Domain.Contribution;
using AcroFunJam.Domain.Identity;

namespace AcroFunJam.Infrastructure.ContextIntegration;

/// <summary>
/// Anti-corruption layer Identity → Contribution (ADR 0022): reads the CURRENT role of the account when it decides,
/// and only tells Contribution whether it grants accepting or refusing proposals.
/// </summary>
public sealed class IdentityValidators(IQueryHandler<GetMyAccount, MyAccountDto> myAccount) : IValidators
{
    public async Task<Validator?> Find(ValidatorId id, CancellationToken ct)
    {
        var account = await myAccount.Handle(new GetMyAccount(new AccountId(id.Value)), ct);
        return account.IsSuccess ? new Validator(id, account.Value!.Role.Grants(Capability.ValidateProposals)) : null;
    }
}
