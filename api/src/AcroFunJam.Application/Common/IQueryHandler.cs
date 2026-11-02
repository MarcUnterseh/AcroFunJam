using AcroFunJam.Domain.Common;

namespace AcroFunJam.Application.Common;

/// <summary>Handles a read-only use case (may project straight to a DTO).</summary>
public interface IQueryHandler<in TQuery, TResult>
{
    Task<Result<TResult>> Handle(TQuery query, CancellationToken ct);
}
