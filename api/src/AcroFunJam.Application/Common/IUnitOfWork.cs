using AcroFunJam.Domain.Common;

namespace AcroFunJam.Application.Common;

/// <summary>Persists the changes of a use case and dispatches the raised domain events.</summary>
public interface IUnitOfWork
{
    /// <summary>
    /// Saves the changes. A uniqueness rule enforced by the database (safety net of a domain rule) is returned as the
    /// matching business error instead of an exception (ADR 0017).
    /// </summary>
    Task<Result<bool>> SaveChanges(CancellationToken ct);
}
