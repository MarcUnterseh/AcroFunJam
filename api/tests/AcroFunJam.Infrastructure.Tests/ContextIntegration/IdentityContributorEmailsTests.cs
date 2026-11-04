using AcroFunJam.Application.Common;
using AcroFunJam.Application.Identity.GetAccountEmails;
using AcroFunJam.Domain.Common;
using AcroFunJam.Domain.Contribution;
using AcroFunJam.Domain.Identity;
using AcroFunJam.Infrastructure.ContextIntegration;

namespace AcroFunJam.Infrastructure.Tests.ContextIntegration;

public sealed class IdentityContributorEmailsTests
{
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    /// <summary>Fake of the Identity query: the address of each known account; answers a single batch.</summary>
    private sealed class FakeAccountEmails(Dictionary<Guid, string> emails)
        : IQueryHandler<GetAccountEmails, IReadOnlyDictionary<AccountId, EmailAddress>>
    {
        private bool _asked;

        public Task<Result<IReadOnlyDictionary<AccountId, EmailAddress>>> Handle(GetAccountEmails query, CancellationToken ct)
        {
            if (_asked) throw new InvalidOperationException("The addresses must be read in a single query (ADR 0022).");
            _asked = true;
            IReadOnlyDictionary<AccountId, EmailAddress> found = query.Accounts
                .Where(a => emails.ContainsKey(a.Value))
                .ToDictionary(a => a, a => EmailAddress.Create(emails[a.Value]).Value!);
            return Task.FromResult(Result<IReadOnlyDictionary<AccountId, EmailAddress>>.Success(found));
        }
    }

    [Fact]
    public async Task Of_Should_MapEachContributorToTheEmailOfItsAccount_When_TheAccountsExist()
    {
        var alice = Guid.NewGuid();
        var bruno = Guid.NewGuid();
        var contributorEmails = new IdentityContributorEmails(
            new FakeAccountEmails(new() { [alice] = "alice@example.org", [bruno] = "bruno@example.org" }));

        var emails = await contributorEmails.Of([new ContributorId(alice), new ContributorId(bruno)], Ct);

        emails.ShouldBe(new Dictionary<ContributorId, string>
        {
            [new ContributorId(alice)] = "alice@example.org",
            [new ContributorId(bruno)] = "bruno@example.org",
        }, ignoreOrder: true);
    }
}
