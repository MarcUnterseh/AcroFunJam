using AcroFunJam.Domain.Common;

namespace AcroFunJam.Infrastructure.Persistence;

/// <summary>
/// The business error meant by a concurrency conflict on a type of record (a concurrency token no longer matches).
/// Each context declares its own (next to its mapping) and the composition root hands them all to
/// <see cref="EfUnitOfWork"/> (ADR 0022).
/// </summary>
public sealed record ConcurrencyConflictError(Type RecordType, Error Error);
