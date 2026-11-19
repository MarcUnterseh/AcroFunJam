using AcroFunJam.Domain.Catalog;

namespace AcroFunJam.Domain.Tests.Catalog;

/// <summary>What a tag applies to: the poses, the transitions, or both (story 9a, Q164, ADR 0035).</summary>
public sealed class TagScopeTests
{
    [Theory]
    [InlineData("poses", TagScope.Poses)]
    [InlineData("transitions", TagScope.Transitions)]
    [InlineData("poses-and-transitions", TagScope.PosesAndTransitions)]
    public void FromCode_Should_GiveTheScope_When_TheCodeIsKnown(string code, TagScope expected)
    {
        TagScopeCodes.FromCode(code).Value.ShouldBe(expected);
        expected.ToCode().ShouldBe(code);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("  ")]
    public void FromCode_Should_RequireAScope_When_NoneIsGiven(string? code) =>
        TagScopeCodes.FromCode(code).Error!.Code.ShouldBe("tag.scope-required");

    [Fact]
    public void FromCode_Should_RefuseAnUnknownScope_When_TheCodeIsNotOne() =>
        TagScopeCodes.FromCode("everything").Error!.Code.ShouldBe("tag.unknown-scope");

    [Theory]
    [InlineData(TagScope.Poses, TagTarget.Pose, true)]
    [InlineData(TagScope.Poses, TagTarget.Transition, false)]
    [InlineData(TagScope.Transitions, TagTarget.Pose, false)]
    [InlineData(TagScope.Transitions, TagTarget.Transition, true)]
    [InlineData(TagScope.PosesAndTransitions, TagTarget.Pose, true)]
    [InlineData(TagScope.PosesAndTransitions, TagTarget.Transition, true)]
    public void Includes_Should_TellWhetherTheTagAppliesToATarget_When_Asked(TagScope scope, TagTarget target, bool expected) =>
        scope.Includes(target).ShouldBe(expected);

    [Theory]
    [InlineData(TagScope.PosesAndTransitions, TagScope.Transitions, true)]
    [InlineData(TagScope.PosesAndTransitions, TagScope.Poses, true)]
    [InlineData(TagScope.Transitions, TagScope.Transitions, true)]
    [InlineData(TagScope.Transitions, TagScope.PosesAndTransitions, false)]
    [InlineData(TagScope.Poses, TagScope.Transitions, false)]
    public void Covers_Should_TellWhetherEveryTargetOfAnotherScopeIsIncluded_When_Asked(TagScope scope, TagScope other, bool expected) =>
        scope.Covers(other).ShouldBe(expected);

    [Theory]
    [InlineData(TagScope.PosesAndTransitions, TagScope.Transitions, new[] { TagTarget.Pose })]
    [InlineData(TagScope.PosesAndTransitions, TagScope.Poses, new[] { TagTarget.Transition })]
    [InlineData(TagScope.Poses, TagScope.Transitions, new[] { TagTarget.Pose })]
    [InlineData(TagScope.Transitions, TagScope.PosesAndTransitions, new TagTarget[0])]
    public void WithdrawnBy_Should_GiveTheTargetsTheNewScopeNoLongerIncludes_When_TheScopeChanges(
        TagScope scope, TagScope next, TagTarget[] expected) =>
        scope.WithdrawnBy(next).ShouldBe(expected);
}
