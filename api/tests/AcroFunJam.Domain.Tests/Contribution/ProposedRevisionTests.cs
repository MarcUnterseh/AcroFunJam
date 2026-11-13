using AcroFunJam.Domain.Contribution;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Domain.Tests.Contribution;

/// <summary>A proposed revision: the values of the pose before it, and the pose as revised (story 6, ADR 0026).</summary>
public sealed class ProposedRevisionTests
{
    private static readonly PriorPose ThroneBefore = new(
        PoseName.Create("Throne").Value!,
        Difficulty.Create(DifficultyLevel.Beginner, DifficultyLevel.Intermediate).Value!,
        FlowBoundaries.Create(canStartFlow: true, canEndFlow: true).Value!);

    [Fact]
    public void Of_Should_ApplyTheChangesToThePriorPose_When_OneFieldChanges()
    {
        var changes = PoseChanges.Create(name: null, baseDifficulty: null, flyerDifficulty: "discovery", canStartFlow: null, canEndFlow: null).Value!;

        var revision = ProposedRevision.Of(ThroneBefore, changes);

        revision.Value.ShouldNotBeNull().ShouldSatisfyAllConditions(
            r => r.Before.ShouldBe(ThroneBefore),
            r => r.After.ShouldBe(ProposedPose.Create("Throne", "beginner", "discovery", canStartFlow: true, canEndFlow: true).Value));
    }

    [Fact]
    public void Of_Should_FailWithRevisionChangesNothing_When_EveryGivenValueEqualsThePriorValue()
    {
        var changes = PoseChanges.Create(name: "Throne", baseDifficulty: "beginner", flyerDifficulty: "intermediate", canStartFlow: true, canEndFlow: null).Value!;

        var revision = ProposedRevision.Of(ThroneBefore, changes);

        revision.Error.ShouldBe(ContributionErrors.RevisionChangesNothing);
    }

    [Fact]
    public void Of_Should_FailWithRevisionChangesNothing_When_TheNameDiffersOnlyBySuperfluousSpaces()
    {
        var changes = PoseChanges.Create(name: "  Throne  ", baseDifficulty: null, flyerDifficulty: null, canStartFlow: null, canEndFlow: null).Value!;

        ProposedRevision.Of(ThroneBefore, changes).Error.ShouldBe(ContributionErrors.RevisionChangesNothing);
    }

    [Fact]
    public void Of_Should_ChangeTheName_When_OnlyItsCaseDiffers()
    {
        var changes = PoseChanges.Create(name: "THRONE", baseDifficulty: null, flyerDifficulty: null, canStartFlow: null, canEndFlow: null).Value!;

        ProposedRevision.Of(ThroneBefore, changes).Value.ShouldNotBeNull().After.Name.Value.ShouldBe("THRONE");
    }

    [Theory]
    [InlineData(null)]
    [InlineData("THRONE")]
    public void ReservedNameKey_Should_BeNone_When_TheNameKeyDoesNotChange(string? name)
    {
        var changes = PoseChanges.Create(name, baseDifficulty: "advanced", flyerDifficulty: null, canStartFlow: null, canEndFlow: null).Value!;

        ProposedRevision.Of(ThroneBefore, changes).Value!.ReservedNameKey.ShouldBeNull();
    }

    [Fact]
    public void ReservedNameKey_Should_BeTheNewKey_When_TheNameKeyChanges()
    {
        var changes = PoseChanges.Create(name: "High Throne", baseDifficulty: null, flyerDifficulty: null, canStartFlow: null, canEndFlow: null).Value!;

        ProposedRevision.Of(ThroneBefore, changes).Value!.ReservedNameKey.ShouldBe(PoseName.Create("high-throne").Value!.Key);
    }

    [Fact]
    public void Changes_Should_ListOnlyTheChangedFieldsWithTheirValueBeforeAndAfter_When_Asked()
    {
        var changes = PoseChanges.Create(name: "THRONE", baseDifficulty: "beginner", flyerDifficulty: "discovery", canStartFlow: null, canEndFlow: false).Value!;

        IReadOnlyList<PoseFieldChange> expected =
        [
            new NameChange(ThroneBefore.Name, PoseName.Create("THRONE").Value!),
            new FlyerDifficultyChange(DifficultyLevel.Intermediate, DifficultyLevel.Discovery),
            new CanEndFlowChange(Before: true, After: false),
        ];

        ProposedRevision.Of(ThroneBefore, changes).Value!.Changes.ShouldBe(expected);
    }
}
