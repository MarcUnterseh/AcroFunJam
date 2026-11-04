using AcroFunJam.Application.Identity.GetAccountEmails;
using AcroFunJam.Domain.Identity;

namespace AcroFunJam.Application.Tests.Identity;

/// <summary>In-memory fake of <see cref="IAccountEmailsReader"/>: the addresses of the existing accounts.</summary>
internal sealed class FakeAccountEmailsReader(params Account[] accounts) : IAccountEmailsReader
{
    public Task<IReadOnlyDictionary<AccountId, EmailAddress>> GetEmails(IReadOnlyCollection<AccountId> ids, CancellationToken ct) =>
        Task.FromResult<IReadOnlyDictionary<AccountId, EmailAddress>>(
            accounts.Where(a => ids.Contains(a.Id)).ToDictionary(a => a.Id, a => a.Email));
}

public sealed class GetAccountEmailsHandlerTests
{
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    [Fact]
    public async Task Handle_Should_ReturnTheEmailOfEachExistingAccount_When_AskedForSeveralAccounts()
    {
        var alice = AnAccount.With("alice@example.org", Role.User);
        var bruno = AnAccount.With("bruno@example.org", Role.Validator);
        var handler = new GetAccountEmailsHandler(
            new FakeAccountEmailsReader(alice, bruno, AnAccount.With("chloe@example.org", Role.User)));

        var result = await handler.Handle(new GetAccountEmails([alice.Id, bruno.Id]), Ct);

        result.Value.ShouldBe(new Dictionary<AccountId, EmailAddress> { [alice.Id] = alice.Email, [bruno.Id] = bruno.Email });
    }

    [Fact]
    public async Task Handle_Should_OmitAnAccount_When_ItNoLongerExists()
    {
        var deleted = new AccountId(Guid.NewGuid());
        var handler = new GetAccountEmailsHandler(new FakeAccountEmailsReader(AnAccount.With("alice@example.org", Role.User)));

        var result = await handler.Handle(new GetAccountEmails([deleted]), Ct);

        result.Value.ShouldNotBeNull().ShouldBeEmpty();
    }
}
