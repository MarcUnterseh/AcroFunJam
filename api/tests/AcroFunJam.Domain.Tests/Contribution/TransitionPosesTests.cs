using AcroFunJam.Domain.Contribution;

namespace AcroFunJam.Domain.Tests.Contribution;

/// <summary>The oriented couple of poses of a transition, its direction (story 7, R4 to R6, ADR 0028).</summary>
public sealed class TransitionPosesTests
{
    private static readonly Guid Throne = Guid.NewGuid();
    private static readonly Guid Bird = Guid.NewGuid();

    [Fact]
    public void Create_Should_KeepTheDirection_When_BothPosesAreGiven()
    {
        var poses = TransitionPoses.Create(Throne, Bird).Value!;

        poses.From.ShouldBe(new PublishedPoseId(Throne));
        poses.To.ShouldBe(new PublishedPoseId(Bird));
        poses.ShouldNotBe(TransitionPoses.Create(Bird, Throne).Value!);
    }

    [Fact]
    public void Create_Should_FailWithFromPoseRequired_When_TheStartPoseIsMissing()
    {
        TransitionPoses.Create(null, Bird).Error.ShouldBe(ContributionErrors.FromPoseRequired);
        TransitionPoses.Create(null, null).Error.ShouldBe(ContributionErrors.FromPoseRequired);
    }

    [Fact]
    public void Create_Should_FailWithToPoseRequired_When_TheEndPoseIsMissing()
    {
        TransitionPoses.Create(Throne, null).Error.ShouldBe(ContributionErrors.ToPoseRequired);
    }

    /// <summary>R6: a washing machine goes back to its start pose.</summary>
    [Fact]
    public void Create_Should_AcceptTheSamePoseTwice_When_TheTransitionGoesBackToItsStartPose()
    {
        TransitionPoses.Create(Throne, Throne).IsSuccess.ShouldBeTrue();
    }
}
