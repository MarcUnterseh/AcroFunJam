using AcroFunJam.Application.Common;
using AcroFunJam.Domain.Common;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace AcroFunJam.Infrastructure.Persistence;

/// <summary>
/// EF Core adapter of <see cref="IUnitOfWork"/>: saves the context, then clears the events of the saved aggregates.
/// The violation of a declared unique constraint, or a declared concurrency conflict, is returned as its business
/// error (ADR 0017, ADR 0022); any other one is a bug.
/// </summary>
public sealed class EfUnitOfWork(
    AcroFunJamDbContext context,
    TrackedAggregates aggregates,
    IEnumerable<UniqueConstraintError> uniqueConstraints,
    IEnumerable<ConcurrencyConflictError> concurrencyConflicts) : IUnitOfWork
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
        exception is DbUpdateConcurrencyException conflict ? DeclaredConflict(conflict) : DeclaredViolation(exception);

    private Error? DeclaredConflict(DbUpdateConcurrencyException conflict) =>
        conflict.Entries
            .Select(entry => concurrencyConflicts.FirstOrDefault(c => c.RecordType == entry.Metadata.ClrType)?.Error)
            .FirstOrDefault(error => error is not null);

    private Error? DeclaredViolation(DbUpdateException exception) =>
        exception.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation } violation
            ? uniqueConstraints.FirstOrDefault(c => c.ConstraintName == violation.ConstraintName)?.Error
            : null;
}
