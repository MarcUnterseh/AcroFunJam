using AcroFunJam.Domain.Common;
using AcroFunJam.Domain.Identity;

namespace AcroFunJam.Application.Identity;

/// <summary>Port: loads and saves the role view of accounts.</summary>
public interface IAccountRepository
{
    Task<Account?> GetById(AccountId id, CancellationToken ct);

    /// <summary>The account using this address, whatever its case.</summary>
    Task<Account?> GetByEmail(EmailAddress email, CancellationToken ct);

    Task<int> CountAdministrators(CancellationToken ct);

    Task Save(Account account, CancellationToken ct);

    /// <summary>
    /// Runs a role change in a serializable transaction, so that concurrent changes cannot both break
    /// "at least one administrator" (ADR 0008). A conflict fails with <c>identity.concurrent-role-change</c>.
    /// </summary>
    Task<Result<T>> InRoleChangeTransaction<T>(Func<CancellationToken, Task<Result<T>>> work, CancellationToken ct);
}
