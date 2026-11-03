using AcroFunJam.Application.Common;
using AcroFunJam.Domain.Common;

namespace AcroFunJam.Application.Tests.Common;

/// <summary>Fake of <see cref="IUnitOfWork"/> counting the saves, or refusing them as a unique index would.</summary>
internal sealed class FakeUnitOfWork(Error? refusal = null) : IUnitOfWork
{
    public int Saves { get; private set; }

    /// <summary>Called on each save (e.g. to record whether it happened inside the name reservation).</summary>
    public Action? OnSave { get; init; }

    public Task<Result<bool>> SaveChanges(CancellationToken ct)
    {
        OnSave?.Invoke();
        if (refusal is not null) return Task.FromResult<Result<bool>>(refusal);
        Saves++;
        return Task.FromResult(Result<bool>.Success(true));
    }
}
