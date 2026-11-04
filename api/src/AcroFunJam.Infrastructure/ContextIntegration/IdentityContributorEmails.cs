using AcroFunJam.Application.Common;
using AcroFunJam.Application.Contribution;
using AcroFunJam.Application.Identity.GetAccountEmails;
using AcroFunJam.Domain.Contribution;
using AcroFunJam.Domain.Identity;

namespace AcroFunJam.Infrastructure.ContextIntegration;

/// <summary>
/// Anti-corruption layer Identity → Contribution (ADR 0022): the addresses of contributors, asked to Identity for the
/// whole batch in a single query. A deleted account has none.
/// </summary>
public sealed class IdentityContributorEmails(IQueryHandler<GetAccountEmails, IReadOnlyDictionary<AccountId, EmailAddress>> accountEmails)
    : IContributorEmails
{
    public async Task<IReadOnlyDictionary<ContributorId, string>> Of(IReadOnlyCollection<ContributorId> contributors, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(contributors);
        var emails = await accountEmails.Handle(new GetAccountEmails([.. contributors.Select(c => new AccountId(c.Value))]), ct);
        if (emails.IsFailure) throw new InvalidOperationException($"Identity could not read the account addresses: {emails.Error!.Code}.");
        return emails.Value!.ToDictionary(e => new ContributorId(e.Key.Value), e => e.Value.Value);
    }
}
