namespace AcroFunJam.Application.Common;

/// <summary>Persists the changes of a use case and dispatches the raised domain events.</summary>
public interface IUnitOfWork
{
    Task SaveChanges(CancellationToken ct);
}
