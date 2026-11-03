using AcroFunJam.Domain.Common;

namespace AcroFunJam.Infrastructure.Persistence;

/// <summary>
/// The business error meant by the violation of a unique constraint. Each context declares its own (next to its
/// mapping) and the composition root hands them all to <see cref="EfUnitOfWork"/> (ADR 0017).
/// </summary>
public sealed record UniqueConstraintError(string ConstraintName, Error Error);
