using AcroFunJam.Application.Catalog.PublishPose;
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
    private sealed class FakePublishPose(Error? refusal = null) : ICommandHandler<PublishPose, PoseId>
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

        var result = await new CatalogPublisher(catalog).PublishPose(source, Throne, Ct);

        result.IsSuccess.ShouldBeTrue();
        catalog.Received.ShouldHaveSingleItem().ShouldBe(new PublishPose(Throne.Name, Throne.Difficulty, Throne.Flow, new SourceProposalId(source.Value)));
    }

    [Fact]
    public async Task PublishPose_Should_TranslateTheRefusal_When_TheNameIsTakenInTheCatalog()
    {
        var result = await new CatalogPublisher(new FakePublishPose(CatalogErrors.PoseNameTaken))
            .PublishPose(new PoseProposalId(Guid.NewGuid()), Throne, Ct);

        result.Error.ShouldBe(ContributionErrors.PoseNameAlreadyInCatalog);
    }
}
