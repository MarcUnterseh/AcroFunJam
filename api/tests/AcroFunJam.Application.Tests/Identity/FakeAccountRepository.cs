using AcroFunJam.Application.Identity;
using AcroFunJam.Domain.Identity;

namespace AcroFunJam.Application.Tests.Identity;

/// <summary>In-memory fake of the <see cref="IAccountRepository"/> port.</summary>
internal sealed class FakeAccountRepository(params Account[] accounts) : IAccountRepository
{
    private readonly Dictionary<AccountId, Account> _accounts = accounts.ToDictionary(a => a.Id);
    private readonly List<Account> _saved = [];

    public IReadOnlyList<Account> Saved => _saved;

    public Task<Account?> GetById(AccountId id, CancellationToken ct) =>
        Task.FromResult(_accounts.GetValueOrDefault(id));

    public Task<Account?> GetByEmail(EmailAddress email, CancellationToken ct) =>
        Task.FromResult(_accounts.Values.SingleOrDefault(a => a.Email == email));

    public Task<int> CountAdministrators(CancellationToken ct) =>
        Task.FromResult(_accounts.Values.Count(a => a.Role == Role.Administrator));

    public Task<AcroFunJam.Domain.Common.Result<T>> InRoleChangeTransaction<T>(
        Func<CancellationToken, Task<AcroFunJam.Domain.Common.Result<T>>> work, CancellationToken ct) => work(ct);

    public Task Save(Account account, CancellationToken ct)
    {
        _saved.Add(account);
        return Task.CompletedTask;
    }
}

internal sealed class FixedTimeProvider(DateTimeOffset now) : TimeProvider
{
    public override DateTimeOffset GetUtcNow() => now;
}

internal static class AnAccount
{
    public static Account With(string email, Role role) =>
        Account.Rehydrate(new AccountId(Guid.NewGuid()), EmailAddress.Create(email).Value!, role);
}
