using AcroFunJam.Domain.Common;

namespace AcroFunJam.Domain.Tests.Common;

public sealed class EntityTests
{
    private readonly record struct ThingId(Guid Value);

    private sealed class Thing(ThingId id) : Entity<ThingId>(id);

    private sealed class OtherThing(ThingId id) : Entity<ThingId>(id);

    [Fact]
    public void Equals_Should_ReturnTrue_When_EntitiesHaveTheSameTypeAndId()
    {
        var id = new ThingId(Guid.NewGuid());

        new Thing(id).ShouldBe(new Thing(id));
        new Thing(id).GetHashCode().ShouldBe(new Thing(id).GetHashCode());
    }

    [Fact]
    public void Equals_Should_ReturnFalse_When_IdsDiffer()
    {
        new Thing(new ThingId(Guid.NewGuid())).ShouldNotBe(new Thing(new ThingId(Guid.NewGuid())));
    }

    [Fact]
    public void Equals_Should_ReturnFalse_When_TypesDifferWithTheSameId()
    {
        var id = new ThingId(Guid.NewGuid());

        new Thing(id).Equals(new OtherThing(id)).ShouldBeFalse();
    }
}
