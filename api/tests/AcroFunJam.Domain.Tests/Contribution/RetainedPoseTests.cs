using AcroFunJam.Domain.Contribution;

namespace AcroFunJam.Domain.Tests.Contribution;

/// <summary>An adjustment is a retained value different from the proposed value, compared after normalisation (ADR 0022).</summary>
public sealed class RetainedPoseTests
{
    private static readonly ProposedPose Throne = ProposedPose.Create("Throne", "beginner", "discovery", canStartFlow: true, canEndFlow: true).Value!;

    private static RetainedPose Retaining(string? name = null, string? flyerDifficulty = null) =>
        Throne.Retain(PoseAdjustments.Create(name, baseDifficulty: null, flyerDifficulty, canStartFlow: null, canEndFlow: null).Value!);

    [Fact]
    public void IsAdjustedFrom_Should_BeFalse_When_TheAdjustedValueEqualsTheProposedValue()
    {
        var retained = Retaining(flyerDifficulty: "discovery");

        retained.IsAdjustedFrom(Throne).ShouldBeFalse();
    }

    [Fact]
    public void IsAdjustedFrom_Should_BeFalse_When_TheAdjustedNameDiffersOnlyBySuperfluousSpaces()
    {
        var retained = Retaining(name: "  Throne  ");

        retained.IsAdjustedFrom(Throne).ShouldBeFalse();
    }

    [Fact]
    public void Create_Should_GiveTheRetainedPose_When_ItsValuesFollowThePoseRules()
    {
        var retained = RetainedPose.Create("Throne", "beginner", "discovery", canStartFlow: true, canEndFlow: true);

        retained.Value.ShouldBe(Throne.Retain(PoseAdjustments.None));
    }

    [Fact]
    public void Create_Should_FailWithTheRuleOfAPose_When_AValueBreaksIt()
    {
        RetainedPose.Create("Throne", "expert", "discovery", canStartFlow: true, canEndFlow: true)
            .Error.ShouldBe(ProposedPose.Create("Throne", "expert", "discovery", canStartFlow: true, canEndFlow: true).Error);
    }

    [Fact]
    public void IsAdjustedFrom_Should_BeTrue_When_OnlyTheCaseOfTheNameDiffers()
    {
        var retained = Retaining(name: "throne");

        retained.IsAdjustedFrom(Throne).ShouldBeTrue();
    }
}
