using AcroFunJam.Domain.Catalog;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Domain.Tests.Catalog;

/// <summary>The order of the transitions on the page of a pose (story 7, C3, ADR 0030).</summary>
public sealed class LinkedTransitionsOrderTests
{
    private static readonly Difficulty Intermediate = Difficulty.Create(DifficultyLevel.Intermediate, DifficultyLevel.Intermediate).Value!;

    private static LinkedTransition To(string otherPose, string? name = null) =>
        new(new TransitionId(Guid.NewGuid()), new PoseId(Guid.NewGuid()), PoseName.Create(otherPose).Value!, TransitionName.CreateOptional(name).Value,
            Intermediate, Description: null, TagSet.Empty);

    /// <summary>The example of C3: the other pose in the order of the catalog, then the name, the unnamed one first.</summary>
    [Fact]
    public void Compare_Should_OrderByOtherPoseThenUnnamedFirstThenName_When_TheTransitionsAreMixed()
    {
        var toThrone = To("Throne");
        var ninjaStar = To("Star", "Ninja Star");
        var toBird = To("Bird");
        var toStar = To("Star");

        new[] { toThrone, ninjaStar, toBird, toStar }.Order(LinkedTransitionsOrder.Instance)
            .ShouldBe([toBird, toStar, ninjaStar, toThrone]);
    }

    [Fact]
    public void Compare_Should_OrderTheNamesByTheirKey_When_SeveralTransitionsLinkTheSamePose()
    {
        var zeta = To("Star", "zeta");
        var alpha = To("Star", "Alpha");

        new[] { zeta, alpha }.Order(LinkedTransitionsOrder.Instance).ShouldBe([alpha, zeta]);
    }
}
