using AcroFunJam.Domain.Common;

namespace AcroFunJam.Application.Catalog;

/// <summary>
/// Port: the lock of the list of tags (ADR 0033). Every write that sets tags (a proposal, an acceptance, a direct tagging) takes it
/// shared, so that they never wait for each other; the removal of a tag takes it exclusive, so that no tag is set while it is
/// checked whether something carries it. The work is committed only when it succeeds.
/// </summary>
public interface ITagListLock
{
    Task<Result<T>> Shared<T>(Func<CancellationToken, Task<Result<T>>> work, CancellationToken ct);

    Task<Result<T>> Exclusive<T>(Func<CancellationToken, Task<Result<T>>> work, CancellationToken ct);
}
