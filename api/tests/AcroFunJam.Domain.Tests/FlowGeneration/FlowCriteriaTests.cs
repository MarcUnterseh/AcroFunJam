using AcroFunJam.Domain.FlowGeneration;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Domain.Tests.FlowGeneration;

/// <summary>The criteria of a generation (story 9, K1 to K8, G5, ADR 0037): length, two ceilings, requested and excluded tags.</summary>
public sealed class FlowCriteriaTests
{
    private static readonly TagId Lunar = new(Guid.NewGuid());
    private static readonly TagId Inversion = new(Guid.NewGuid());
    private static readonly TagId Pop = new(Guid.NewGuid());

    private static Difficulty Of(DifficultyLevel @base, DifficultyLevel flyer) => Difficulty.Create(@base, flyer).Value!;

    // --- Length (G5) ----------------------------------------------------------------------------

    [Theory]
    [InlineData(1)]
    [InlineData(3)]
    [InlineData(10)]
    public void FlowLengthCreate_Should_ReturnTheLength_When_BetweenOneAndTen(int length) =>
        FlowLength.Create(length).Value!.Value.ShouldBe(length);

    [Theory]
    [InlineData(0)]
    [InlineData(11)]
    [InlineData(-1)]
    public void FlowLengthCreate_Should_FailWithLengthOutOfRange_When_BelowOneOrAboveTen(int length) =>
        FlowLength.Create(length).Error.ShouldBe(FlowGenerationErrors.LengthOutOfRange);

    [Fact]
    public void FlowLengthCreate_Should_FailWithLengthRequired_When_Missing() =>
        FlowLength.Create(null).Error.ShouldBe(FlowGenerationErrors.LengthRequired);

    // --- Ceilings (K1, K2, K3) ------------------------------------------------------------------

    [Theory]
    [InlineData(DifficultyLevel.Discovery, DifficultyLevel.Beginner)]
    [InlineData(DifficultyLevel.Beginner, DifficultyLevel.Beginner)]
    public void Admits_Should_BeTrue_When_BothLevelsAreAtMostTheCeilings(DifficultyLevel @base, DifficultyLevel flyer) =>
        DifficultyCeiling.FromCodes("beginner", "beginner").Value!.Admits(Of(@base, flyer)).ShouldBeTrue();

    [Theory]
    [InlineData(DifficultyLevel.Intermediate, DifficultyLevel.Beginner)]
    [InlineData(DifficultyLevel.Beginner, DifficultyLevel.Advanced)]
    public void Admits_Should_BeFalse_When_TheBaseOrTheFlyerLevelExceedsItsCeiling(DifficultyLevel @base, DifficultyLevel flyer) =>
        DifficultyCeiling.FromCodes("beginner", "beginner").Value!.Admits(Of(@base, flyer)).ShouldBeFalse();

    [Fact]
    public void FromCodes_Should_FailWithBaseCeilingRequired_When_BothAreMissing() =>
        DifficultyCeiling.FromCodes(null, null).Error.ShouldBe(FlowGenerationErrors.BaseDifficultyCeilingRequired);

    [Fact]
    public void FromCodes_Should_FailWithFlyerCeilingRequired_When_OnlyTheFlyerIsMissing() =>
        DifficultyCeiling.FromCodes("beginner", null).Error.ShouldBe(FlowGenerationErrors.FlyerDifficultyCeilingRequired);

    [Fact]
    public void FromCodes_Should_FailWithUnknownDifficultyLevel_When_ACeilingIsOffTheScale() =>
        DifficultyCeiling.FromCodes("expert", "beginner").Error!.Code.ShouldBe("pose.unknown-difficulty-level");

    // --- Tags (K4, K6) ------------------------------------------------------------------------

    [Fact]
    public void IsSatisfiedBy_Should_BeTrue_When_NoTagIsRequested() =>
        TagCriteria.None.IsSatisfiedBy(TagSet.Empty, TagSet.Empty).ShouldBeTrue();

    [Fact]
    public void IsSatisfiedBy_Should_BeTrue_When_TheTransitionCarriesOneOfTheRequestedTags() =>
        new TagCriteria(TagSet.Of([Lunar, Pop]), TagSet.Empty).IsSatisfiedBy(TagSet.Of([Pop]), TagSet.Empty).ShouldBeTrue();

    [Fact]
    public void IsSatisfiedBy_Should_BeTrue_When_OnlyTheArrivalPoseCarriesOne() =>
        new TagCriteria(TagSet.Of([Lunar]), TagSet.Empty).IsSatisfiedBy(TagSet.Empty, TagSet.Of([Lunar])).ShouldBeTrue();

    [Fact]
    public void IsSatisfiedBy_Should_BeFalse_When_NeitherTheTransitionNorTheArrivalPoseCarriesOne() =>
        new TagCriteria(TagSet.Of([Lunar]), TagSet.Empty).IsSatisfiedBy(TagSet.Of([Pop]), TagSet.Of([Inversion])).ShouldBeFalse();

    [Fact]
    public void TagCriteriaAdmits_Should_BeFalse_When_TheElementCarriesAnExcludedTag() =>
        new TagCriteria(TagSet.Empty, TagSet.Of([Inversion])).Admits(TagSet.Of([Lunar, Inversion])).ShouldBeFalse();

    [Fact]
    public void TagCriteriaAdmits_Should_BeTrue_When_TheElementCarriesNoExcludedTag() =>
        new TagCriteria(TagSet.Empty, TagSet.Of([Inversion])).Admits(TagSet.Of([Lunar])).ShouldBeTrue();

    [Fact]
    public void NotInList_Should_GiveTheRequestedAndExcludedTagsMissingFromTheList_When_SomeAre()
    {
        var classique = new TagId(Guid.NewGuid());
        var envol = new TagId(Guid.NewGuid());

        new TagCriteria(TagSet.Of([Lunar, classique]), TagSet.Of([envol])).NotInList(TagSet.Of([Lunar, Inversion]))
            .ShouldBe(TagSet.Of([classique, envol]));
    }

    // --- All the criteria (G5, K3) ----------------------------------------------------------------

    [Fact]
    public void FlowCriteriaCreate_Should_CheckTheLengthFirst_When_SeveralCriteriaAreInvalid() =>
        FlowCriteria.Create(null, null, "expert", TagSet.Empty, TagSet.Empty).Error.ShouldBe(FlowGenerationErrors.LengthRequired);

    [Fact]
    public void FlowCriteriaCreate_Should_CheckTheCeilingsAfterTheLength_When_TheLengthIsValid() =>
        FlowCriteria.Create(3, null, "beginner", TagSet.Empty, TagSet.Empty).Error.ShouldBe(FlowGenerationErrors.BaseDifficultyCeilingRequired);

    [Fact]
    public void FlowCriteriaCreate_Should_KeepEveryCriterion_When_TheyAreValid()
    {
        var criteria = FlowCriteria.Create(3, "beginner", "intermediate", TagSet.Of([Lunar]), TagSet.Of([Inversion])).Value!;

        criteria.ShouldSatisfyAllConditions(
            c => c.Length.Value.ShouldBe(3),
            c => c.Ceiling.ShouldBe(new DifficultyCeiling(DifficultyLevel.Beginner, DifficultyLevel.Intermediate)),
            c => c.Tags.ShouldBe(new TagCriteria(TagSet.Of([Lunar]), TagSet.Of([Inversion]))));
    }
}
