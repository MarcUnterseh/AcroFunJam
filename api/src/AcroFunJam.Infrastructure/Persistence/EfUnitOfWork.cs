using AcroFunJam.Application.Common;
using AcroFunJam.Domain.Common;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace AcroFunJam.Infrastructure.Persistence;

/// <summary>
/// EF Core adapter of <see cref="IUnitOfWork"/>: saves the context, then clears the events of the saved aggregates.
/// The violation of a declared unique constraint is returned as its business error; any other one is a bug.
/// </summary>
public sealed class EfUnitOfWork(
    AcroFunJamDbContext context, TrackedAggregates aggregates, IEnumerable<UniqueConstraintError> uniqueConstraints) : IUnitOfWork
{
    public async Task<Result<bool>> SaveChanges(CancellationToken ct)
    {
        try
        {
            await context.SaveChangesAsync(ct);
        }
        catch (DbUpdateException exception) when (DeclaredError(exception) is { } error)
        {
            context.ChangeTracker.Clear(); // nothing of the refused work may be saved later in the scope
            return error;
        }

        aggregates.ClearDomainEvents();
        return Result<bool>.Success(true);
    }

    private Error? DeclaredError(DbUpdateException exception) =>
        exception.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation } violation
            ? uniqueConstraints.FirstOrDefault(c => c.ConstraintName == violation.ConstraintName)?.Error
            : null;
}
