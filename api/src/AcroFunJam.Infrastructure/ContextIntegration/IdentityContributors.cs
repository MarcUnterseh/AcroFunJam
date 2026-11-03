using AcroFunJam.Application.Common;
using AcroFunJam.Application.Contribution;
using AcroFunJam.Application.Identity.GetMyAccount;
using AcroFunJam.Domain.Contribution;
using AcroFunJam.Domain.Identity;

namespace AcroFunJam.Infrastructure.ContextIntegration;

/// <summary>
/// Anti-corruption layer Identity → Contribution (ADR 0016): reads the CURRENT role of the account, as the
/// authorization policies do, and only tells Contribution whether it grants accepting or refusing proposals.
/// </summary>
public sealed class IdentityContributors(IQueryHandler<GetMyAccount, MyAccountDto> myAccount) : IContributors
{
    public async Task<Contributor?> Find(ContributorId id, CancellationToken ct)
    {
        var account = await myAccount.Handle(new GetMyAccount(new AccountId(id.Value)), ct);
        return account.IsSuccess ? new Contributor(id, account.Value!.Role.Grants(Capability.ValidateProposals)) : null;
    }
}
