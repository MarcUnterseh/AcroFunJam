using AcroFunJam.Domain.Common;

namespace AcroFunJam.Domain.Tests.Common;

public sealed class AggregateRootTests
{
    private readonly record struct CounterId(Guid Value);

    private sealed record Incremented(CounterId CounterId, DateTimeOffset OccurredAt) : IDomainEvent;

    private sealed class Counter(CounterId id) : AggregateRoot<CounterId>(id)
    {
        public void Increment(DateTimeOffset now) => Raise(new Incremented(Id, now));
    }

    private static readonly DateTimeOffset Now = new(2026, 11, 2, 10, 0, 0, TimeSpan.Zero);

    [Fact]
    public void Raise_Should_RecordTheDomainEvent_When_ABehaviourIsInvoked()
    {
        var counter = new Counter(new CounterId(Guid.NewGuid()));

        counter.Increment(Now);

        counter.DomainEvents.ShouldHaveSingleItem().ShouldBe(new Incremented(counter.Id, Now));
    }

    [Fact]
    public void ClearDomainEvents_Should_EmptyTheEvents_When_TheyHaveBeenDispatched()
    {
        var counter = new Counter(new CounterId(Guid.NewGuid()));
        counter.Increment(Now);

        counter.ClearDomainEvents();

        counter.DomainEvents.ShouldBeEmpty();
    }
}
