namespace AcroFunJam.Domain.Common;

/// <summary>Something that happened in the domain, named in the past tense.</summary>
public interface IDomainEvent
{
    DateTimeOffset OccurredAt { get; }
}
