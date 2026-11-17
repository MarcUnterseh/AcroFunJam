using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Domain.Tests.SharedKernel;

/// <summary>The tags of a transition (story 8, ADR 0033): each at most once, the order not counting.</summary>
public sealed class TagSetTests
{
    private static readonly TagId Pop = new(Guid.NewGuid());
    private static readonly TagId Dynamic = new(Guid.NewGuid());

    [Fact]
    public void Of_Should_KeepEachTagOnce_When_ATagIsGivenTwice()
    {
        TagSet.Of([Pop, Pop]).ShouldBe(TagSet.Of([Pop]));
        TagSet.Of([Pop, Pop]).Count.ShouldBe(1);
    }

    [Fact]
    public void Equals_Should_IgnoreTheOrder_When_TwoSetsHaveTheSameTags()
    {
        TagSet.Of([Pop, Dynamic]).ShouldBe(TagSet.Of([Dynamic, Pop]));
        TagSet.Of([Pop, Dynamic]).GetHashCode().ShouldBe(TagSet.Of([Dynamic, Pop]).GetHashCode());
    }

    [Fact]
    public void Equals_Should_Differ_When_TheTagsDiffer()
    {
        TagSet.Of([Pop]).ShouldNotBe(TagSet.Of([Pop, Dynamic]));
        TagSet.Empty.ShouldNotBe(TagSet.Of([Pop]));
    }

    [Fact]
    public void Empty_Should_HaveNoTag_When_Used()
    {
        TagSet.Empty.Count.ShouldBe(0);
        TagSet.Of([]).ShouldBe(TagSet.Empty);
        TagSet.Empty.Contains(Pop).ShouldBeFalse();
    }
}
