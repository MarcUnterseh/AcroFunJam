using AcroFunJam.Domain.Common;

namespace AcroFunJam.Application.Common;

/// <summary>Handles a use case that changes the state of a single aggregate.</summary>
public interface ICommandHandler<in TCommand, TResult>
{
    Task<Result<TResult>> Handle(TCommand command, CancellationToken ct);
}
