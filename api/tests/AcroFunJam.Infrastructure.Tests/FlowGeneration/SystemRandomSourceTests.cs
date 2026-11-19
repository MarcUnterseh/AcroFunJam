using AcroFunJam.Infrastructure.FlowGeneration;

namespace AcroFunJam.Infrastructure.Tests.FlowGeneration;

/// <summary>The chance of a generation (G6): no seed, every index can come out.</summary>
public sealed class SystemRandomSourceTests
{
    [Fact]
    public void NextIndex_Should_DrawEveryIndexFromZeroToCountMinusOne_When_DrawnOften()
    {
        var source = new SystemRandomSource();

        var drawn = Enumerable.Range(0, 1_000).Select(_ => source.NextIndex(3)).ToHashSet();

        drawn.ShouldBe([0, 1, 2], ignoreOrder: true);
    }
}
