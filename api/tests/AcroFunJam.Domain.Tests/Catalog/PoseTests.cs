using AcroFunJam.Domain.Catalog;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Domain.Tests.Catalog;

public sealed class PoseTests
{
    private static readonly DateTimeOffset Now = new(2026, 11, 3, 10, 0, 0, TimeSpan.Zero);
    private static readonly PoseId AnId = new(Guid.NewGuid());
    private static readonly PoseName Throne = PoseName.Create("Throne").Value!;
    private static readonly Difficulty BeginnerOnDiscovery = Difficulty.Create(DifficultyLevel.Beginner, DifficultyLevel.Discovery).Value!;
    private static readonly FlowBoundaries StartsAndEnds = FlowBoundaries.Create(canStartFlow: true, canEndFlow: true).Value!;

    [Fact]
    public void Publish_Should_CreateThePoseAndRaisePosePublished_When_TheNameIsFree()
    {
        var pose = Pose.Publish(AnId, Throne, BeginnerOnDiscovery, StartsAndEnds, source: null, nameAlreadyPublished: false, Now);

        pose.IsSuccess.ShouldBeTrue();
        var published = pose.Value!;
        published.Id.ShouldBe(AnId);
        published.Name.ShouldBe(Throne);
        published.Difficulty.ShouldBe(BeginnerOnDiscovery);
        published.Flow.ShouldBe(StartsAndEnds);
        published.SourceProposalId.ShouldBeNull();
        published.PublishedAt.ShouldBe(Now);
        published.DomainEvents.ShouldHaveSingleItem().ShouldBe(new PosePublished(AnId, Throne, SourceProposalId: null, Now));
    }

    [Fact]
    public void Publish_Should_StartAtVersionOne_When_Published()
    {
        var pose = Pose.Publish(AnId, Throne, BeginnerOnDiscovery, StartsAndEnds, source: null, nameAlreadyPublished: false, Now);

        pose.Value!.Version.Value.ShouldBe(1);
    }

    [Fact]
    public void Publish_Should_KeepTheSourceProposal_When_ThePoseComesFromAProposal()
    {
        var source = new SourceProposalId(Guid.NewGuid());

        var pose = Pose.Publish(AnId, Throne, BeginnerOnDiscovery, StartsAndEnds, source, nameAlreadyPublished: false, Now);

        pose.Value!.SourceProposalId.ShouldBe(source);
        pose.Value.DomainEvents.ShouldHaveSingleItem().ShouldBe(new PosePublished(AnId, Throne, source, Now));
    }

    [Fact]
    public void Publish_Should_FailWithoutEvent_When_AnotherPublishedPoseHasTheName()
    {
        var pose = Pose.Publish(AnId, Throne, BeginnerOnDiscovery, StartsAndEnds, source: null, nameAlreadyPublished: true, Now);

        pose.Error.ShouldBe(CatalogErrors.PoseNameTaken);
    }

    private static readonly DateTimeOffset Later = Now.AddDays(9);
    private static readonly SourceProposalId ARevision = new(Guid.NewGuid());

    private static Pose APublishedThrone() =>
        Pose.Publish(AnId, Throne, BeginnerOnDiscovery, StartsAndEnds, source: null, nameAlreadyPublished: false, Now).Value!;

    [Fact]
    public void Revise_Should_ReplaceTheValuesKeepTheIdentityAndIncrementTheVersion_When_TheExpectedVersionIsCurrent()
    {
        var pose = APublishedThrone();
        pose.ClearDomainEvents();
        var highThrone = PoseName.Create("High Throne").Value!;
        var advanced = Difficulty.Create(DifficultyLevel.Advanced, DifficultyLevel.Discovery).Value!;
        var endsOnly = FlowBoundaries.Create(canStartFlow: false, canEndFlow: true).Value!;

        var revised = pose.Revise(highThrone, advanced, endsOnly, PoseVersion.Initial, nameTakenByAnotherPose: false, ARevision, Later);

        revised.IsSuccess.ShouldBeTrue();
        pose.ShouldSatisfyAllConditions(
            p => p.Id.ShouldBe(AnId),
            p => p.Name.ShouldBe(highThrone),
            p => p.Difficulty.ShouldBe(advanced),
            p => p.Flow.ShouldBe(endsOnly),
            p => p.Version.ShouldBe(PoseVersion.Of(2)),
            p => p.DomainEvents.ShouldBe([new PoseRevised(AnId, PoseVersion.Of(2), highThrone, ARevision, Later)]));
    }

    [Fact]
    public void Revise_Should_FailWithPoseVersionMismatchAndChangeNothing_When_TheExpectedVersionIsNotCurrent()
    {
        var pose = APublishedThrone();

        var revised = pose.Revise(Throne, BeginnerOnDiscovery, StartsAndEnds, PoseVersion.Of(2), nameTakenByAnotherPose: false, ARevision, Later);

        revised.Error.ShouldBe(CatalogErrors.PoseVersionMismatch);
        pose.Version.ShouldBe(PoseVersion.Initial);
    }

    [Fact]
    public void Revise_Should_FailWithPoseNameTaken_When_AnotherPoseHasTheNewName()
    {
        var pose = APublishedThrone();

        var revised = pose.Revise(
            PoseName.Create("Bird").Value!, BeginnerOnDiscovery, StartsAndEnds, PoseVersion.Initial, nameTakenByAnotherPose: true, ARevision, Later);

        revised.Error.ShouldBe(CatalogErrors.PoseNameTaken);
        pose.Name.ShouldBe(Throne);
    }

    [Fact]
    public void Next_Should_FollowTheVersion_When_ThePoseIsRevised()
    {
        PoseVersion.Initial.Next().ShouldBe(PoseVersion.Of(2));
    }
}
