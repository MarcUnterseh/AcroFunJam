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
}
