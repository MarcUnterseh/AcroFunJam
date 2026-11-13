using AcroFunJam.Application.Catalog.PublishPose;
using AcroFunJam.Application.Catalog.RevisePose;
using AcroFunJam.Application.Common;
using AcroFunJam.Domain.Catalog;
using AcroFunJam.Domain.Common;
using AcroFunJam.Domain.Contribution;
using AcroFunJam.Infrastructure.ContextIntegration;

namespace AcroFunJam.Infrastructure.Tests.ContextIntegration;

public sealed class CatalogPublisherTests
{
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    /// <summary>Fake of the Catalog command: records the publications, or refuses them.</summary>
    internal sealed class FakePublishPose(Error? refusal = null) : ICommandHandler<PublishPose, PoseId>
    {
        public List<PublishPose> Received { get; } = [];

        public Task<Result<PoseId>> Handle(PublishPose command, CancellationToken ct)
        {
            Received.Add(command);
            return Task.FromResult(refusal is null ? Result<PoseId>.Success(new PoseId(Guid.NewGuid())) : Result<PoseId>.Failure(refusal));
        }
    }

    private static readonly RetainedPose Throne =
        ProposedPose.Create("Throne", "beginner", "discovery", true, false).Value!.Retain(PoseAdjustments.None);

    [Fact]
    public async Task PublishPose_Should_PublishTheRetainedPoseWithItsSource_When_TheCatalogAccepts()
    {
        var catalog = new FakePublishPose();
        var source = new PoseProposalId(Guid.NewGuid());

        var result = await new CatalogPublisher(catalog, new FakeRevisePose(), new FakePublishTransition()).PublishPose(source, Throne, Ct);

        result.IsSuccess.ShouldBeTrue();
        catalog.Received.ShouldHaveSingleItem().ShouldBe(new PublishPose(Throne.Name, Throne.Difficulty, Throne.Flow, new SourceProposalId(source.Value)));
    }

    [Fact]
    public async Task PublishPose_Should_TranslateTheRefusal_When_TheNameIsTakenInTheCatalog()
    {
        var result = await new CatalogPublisher(new FakePublishPose(CatalogErrors.PoseNameTaken), new FakeRevisePose(), new FakePublishTransition())
            .PublishPose(new PoseProposalId(Guid.NewGuid()), Throne, Ct);

        result.Error.ShouldBe(ContributionErrors.PoseNameAlreadyInCatalog);
    }

    /// <summary>Fake of the Catalog command: records the revisions, or refuses them.</summary>
    internal sealed class FakeRevisePose(Error? refusal = null) : ICommandHandler<RevisePose, PoseVersion>
    {
        public List<RevisePose> Received { get; } = [];

        public Task<Result<PoseVersion>> Handle(RevisePose command, CancellationToken ct)
        {
            Received.Add(command);
            return Task.FromResult(refusal is null ? Result<PoseVersion>.Success(PoseVersion.Of(5)) : Result<PoseVersion>.Failure(refusal));
        }
    }

    [Fact]
    public async Task RevisePose_Should_ReviseThePoseWithTheRetainedRevisionFromItsVersion_When_TheCatalogAccepts()
    {
        var catalog = new FakeRevisePose();
        var source = new PoseRevisionProposalId(Guid.NewGuid());
        var pose = new PublishedPoseId(Guid.NewGuid());

        var result = await new CatalogPublisher(new FakePublishPose(), catalog, new FakePublishTransition()).RevisePose(source, pose, new PublishedPoseVersion(4), Throne, Ct);

        result.IsSuccess.ShouldBeTrue();
        catalog.Received.ShouldHaveSingleItem().ShouldBe(
            new RevisePose(new PoseId(pose.Value), Throne.Name, Throne.Difficulty, Throne.Flow, PoseVersion.Of(4), new SourceProposalId(source.Value)));
    }

    [Theory]
    [InlineData("catalog.pose-name-taken", "contribution.pose-name-already-in-catalog")]
    [InlineData("catalog.pose-version-mismatch", "contribution.pose-changed-since-revision-started")]
    [InlineData("catalog.pose-not-found", "contribution.pose-not-found")]
    public async Task RevisePose_Should_TranslateTheRefusal_When_TheCatalogRefuses(string catalogCode, string contributionCode)
    {
        Error[] refusals = [CatalogErrors.PoseNameTaken, CatalogErrors.PoseVersionMismatch, CatalogErrors.PoseNotFound];

        var result = await new CatalogPublisher(new FakePublishPose(), new FakeRevisePose(refusals.Single(e => e.Code == catalogCode)), new FakePublishTransition())
            .RevisePose(new PoseRevisionProposalId(Guid.NewGuid()), new PublishedPoseId(Guid.NewGuid()), new PublishedPoseVersion(1), Throne, Ct);

        result.Error.ShouldNotBeNull().Code.ShouldBe(contributionCode);
    }
}
