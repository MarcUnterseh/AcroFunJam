using System.Data;
using AcroFunJam.Application.Identity;
using AcroFunJam.Domain.Common;
using AcroFunJam.Domain.Identity;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace AcroFunJam.Infrastructure.Persistence.Identity;

/// <summary>EF Core adapter of <see cref="IAccountRepository"/>: the role view of the Identity users.</summary>
public sealed class EfAccountRepository(AcroFunJamDbContext context, ILookupNormalizer normalizer) : IAccountRepository
{
    public async Task<Account?> GetById(AccountId id, CancellationToken ct)
    {
        var user = await context.Users.AsNoTracking().SingleOrDefaultAsync(u => u.Id == id.Value, ct);
        return user is null ? null : ToAccount(user);
    }

    public async Task<Account?> GetByEmail(EmailAddress email, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(email);
        // The normaliser of ASP.NET Core Identity: the very key it stores, so the address is case-insensitive.
        var normalized = normalizer.NormalizeEmail(email.Value);
        var user = await context.Users.AsNoTracking().SingleOrDefaultAsync(u => u.NormalizedEmail == normalized, ct);
        return user is null ? null : ToAccount(user);
    }

    public Task<int> CountAdministrators(CancellationToken ct) =>
        context.Users.CountAsync(u => u.Role == Role.Administrator.Code, ct);

    public async Task Save(Account account, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(account);
        await context.Users
            .Where(u => u.Id == account.Id.Value)
            .ExecuteUpdateAsync(setters => setters.SetProperty(u => u.Role, account.Role.Code), ct);
        account.ClearDomainEvents();
    }

    public async Task<Result<T>> InRoleChangeTransaction<T>(Func<CancellationToken, Task<Result<T>>> work, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(work);
        try
        {
            await using var transaction = await context.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
            var result = await work(ct);
            if (result.IsSuccess) await transaction.CommitAsync(ct);
            return result;
        }
        catch (Exception exception) when (IsSerializationFailure(exception))
        {
            // PostgreSQL detected that another role change read the same administrators (write skew).
            return IdentityErrors.ConcurrentRoleChange;
        }
    }

    private static bool IsSerializationFailure(Exception exception) =>
        exception is PostgresException { SqlState: PostgresErrorCodes.SerializationFailure }
        || exception.InnerException is PostgresException { SqlState: PostgresErrorCodes.SerializationFailure };

    private static Account ToAccount(ApplicationUser user) =>
        Account.Rehydrate(new AccountId(user.Id), EmailAddress.Create(user.Email!).Value!, ToRole(user.Role));

    private static Role ToRole(string code) =>
        Role.FromCode(code) is { IsSuccess: true } role
            ? role.Value!
            : throw new InvalidOperationException($"Unknown role code '{code}' in identity.users.");
}
