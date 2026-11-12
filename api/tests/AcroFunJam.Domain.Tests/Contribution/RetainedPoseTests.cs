using AcroFunJam.Domain.Contribution;
using AcroFunJam.Domain.SharedKernel;

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
    public void AdjustmentsFrom_Should_ReturnNoAdjustment_When_RetainedPoseEqualsProposedPose()
    {
        var retained = Throne.Retain(PoseAdjustments.None);

        IReadOnlyList<PoseFieldAdjustment> adjustments = retained.AdjustmentsFrom(Throne);

        adjustments.ShouldBeEmpty();
    }

    [Fact]
    public void AdjustmentsFrom_Should_ReturnTheFlyerDifficultyWithBothValues_When_OnlyTheFlyerDifficultyWasAdjusted()
    {
        var retained = Retaining(flyerDifficulty: "intermediate");

        var adjustments = retained.AdjustmentsFrom(Throne);

        adjustments.ShouldBe(
            [new FlyerDifficultyAdjustment(DifficultyLevel.Discovery, DifficultyLevel.Intermediate)]);
    }

    [Fact]
    public void AdjustmentsFrom_Should_ReturnTheCanEndFlowIndicatorWithBothValues_When_ItWasAdjusted()
    {
        var retained = Throne.Retain(PoseAdjustments.Create(null, null, null, canStartFlow: null, canEndFlow: false).Value!);

        var adjustments = retained.AdjustmentsFrom(Throne);

        adjustments.ShouldBe([new CanEndFlowAdjustment(Proposed: true, Retained: false)]);
    }

    [Fact]
    public void AdjustmentsFrom_Should_ReturnTheName_When_OnlyItsCaseChanged()
    {
        var retained = Retaining(name: "throne");

        var adjustments = retained.AdjustmentsFrom(Throne);

        adjustments.ShouldBe([new NameAdjustment(Throne.Name, retained.Name)]);
    }

    [Fact]
    public void AdjustmentsFrom_Should_ReturnNoAdjustment_When_TheNameDiffersOnlyBySuperfluousSpaces()
    {
        var retained = Retaining(name: "  Throne  ");

        retained.AdjustmentsFrom(Throne).ShouldBeEmpty();
    }

    [Fact]
    public void AdjustmentsFrom_Should_ListAdjustmentsInTheOrderOfTheForm_When_SeveralFieldsWereAdjusted()
    {
        var retained = Throne.Retain(
            PoseAdjustments.Create("Throne Bird", "advanced", "intermediate", canStartFlow: false, canEndFlow: false).Value!);

        var adjustments = retained.AdjustmentsFrom(Throne);

        adjustments.ShouldBe(
        [
            new NameAdjustment(Throne.Name, retained.Name),
            new BaseDifficultyAdjustment(DifficultyLevel.Beginner, DifficultyLevel.Advanced),
            new FlyerDifficultyAdjustment(DifficultyLevel.Discovery, DifficultyLevel.Intermediate),
            new CanStartFlowAdjustment(Proposed: true, Retained: false),
            new CanEndFlowAdjustment(Proposed: true, Retained: false),
        ]);
    }

    [Fact]
    public void IsAdjustedFrom_Should_BeTrue_When_OnlyTheCaseOfTheNameDiffers()
    {
        var retained = Retaining(name: "throne");

        retained.IsAdjustedFrom(Throne).ShouldBeTrue();
    }
}
