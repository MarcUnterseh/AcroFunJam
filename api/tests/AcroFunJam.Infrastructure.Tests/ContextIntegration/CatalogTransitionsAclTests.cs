using AcroFunJam.Application.Catalog.IsTransitionSlotPublished;
using AcroFunJam.Application.Catalog.PublishTransition;
using AcroFunJam.Application.Common;
using AcroFunJam.Domain.Catalog;
using AcroFunJam.Domain.Common;
using AcroFunJam.Domain.Contribution;
using AcroFunJam.Domain.SharedKernel;
using AcroFunJam.Infrastructure.ContextIntegration;

namespace AcroFunJam.Infrastructure.Tests.ContextIntegration;

/// <summary>Fake of the Catalog command: records the publications of transitions, or refuses them.</summary>
internal sealed class FakePublishTransition(Error? refusal = null) : ICommandHandler<PublishTransition, TransitionId>
{
    public List<PublishTransition> Received { get; } = [];

    public Task<Result<TransitionId>> Handle(PublishTransition command, CancellationToken ct)
    {
        Received.Add(command);
        return Task.FromResult(refusal is null ? Result<TransitionId>.Success(new TransitionId(Guid.NewGuid())) : Result<TransitionId>.Failure(refusal));
    }
}

/// <summary>Anti-corruption layer Contribution → Catalog for the transitions (story 7, ADR 0028, ADR 0029).</summary>
public sealed class CatalogTransitionsAclTests
{
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    private static readonly TransitionPoses StarToStar = TransitionPoses.Create(Guid.NewGuid(), Guid.NewGuid()).Value!;

    private static readonly RetainedTransition NinjaStar =
        RetainedTransition.Create("Ninja Star", "advanced", "advanced", "Rotation complète.").Value!;

    private static CatalogPublisher Publisher(FakePublishTransition publishTransition) =>
        new(new CatalogPublisherTests.FakePublishPose(), new CatalogPublisherTests.FakeRevisePose(), publishTransition);

    [Fact]
    public async Task PublishTransition_Should_PublishTheRetainedTransitionWithItsSource_When_TheCatalogAccepts()
    {
        var catalog = new FakePublishTransition();
        var source = new TransitionProposalId(Guid.NewGuid());

        var result = await Publisher(catalog).PublishTransition(source, StarToStar, NinjaStar, Ct);

        result.IsSuccess.ShouldBeTrue();
        var received = catalog.Received.ShouldHaveSingleItem();
        received.ShouldBe(new PublishTransition(
            new PoseId(StarToStar.From.Value), new PoseId(StarToStar.To.Value), NinjaStar.Name, NinjaStar.Difficulty, NinjaStar.Description,
            new SourceProposalId(source.Value), received.Tags));
        received.Tags.ShouldBeEmpty();
    }

    /// <summary>Story 8: the retained tags are published with the transition (ADR 0033).</summary>
    [Fact]
    public async Task PublishTransition_Should_PublishTheRetainedTags_When_TheTransitionCarriesSome()
    {
        var catalog = new FakePublishTransition();
        var pop = new TagId(Guid.NewGuid());

        await Publisher(catalog).PublishTransition(new TransitionProposalId(Guid.NewGuid()), StarToStar, NinjaStar with { Tags = TagSet.Of([pop]) }, Ct);

        catalog.Received.ShouldHaveSingleItem().Tags.ShouldBe([pop]);
    }

    [Fact]
    public async Task PublishTransition_Should_TellTheTagsNotInTheList_When_TheCatalogRefusesThem()
    {
        var classique = TagSet.Of([new TagId(Guid.NewGuid())]);

        var result = await Publisher(new FakePublishTransition(new TagNotInListError(classique)))
            .PublishTransition(new TransitionProposalId(Guid.NewGuid()), StarToStar, NinjaStar, Ct);

        result.Error.ShouldBeOfType<ProposedTagsNotInListError>().Tags.ShouldBe(classique);
    }

    [Theory]
    [InlineData("catalog.transition-name-taken", "contribution.transition-name-already-in-catalog")]
    [InlineData("catalog.unnamed-transition-taken", "contribution.unnamed-transition-already-in-catalog")]
    [InlineData("catalog.from-pose-not-found", "contribution.from-pose-not-found")]
    [InlineData("catalog.to-pose-not-found", "contribution.to-pose-not-found")]
    public async Task PublishTransition_Should_TranslateTheRefusal_When_TheCatalogRefuses(string catalogCode, string contributionCode)
    {
        Error[] refusals = [CatalogErrors.TransitionNameTaken, CatalogErrors.UnnamedTransitionTaken, CatalogErrors.FromPoseNotFound, CatalogErrors.ToPoseNotFound];

        var result = await Publisher(new FakePublishTransition(refusals.Single(e => e.Code == catalogCode)))
            .PublishTransition(new TransitionProposalId(Guid.NewGuid()), StarToStar, NinjaStar, Ct);

        result.Error.ShouldNotBeNull().Code.ShouldBe(contributionCode);
    }

    /// <summary>Fake of the Catalog query: the places taken, or a failure.</summary>
    private sealed class FakeIsTransitionSlotPublished(Error? failure = null) : IQueryHandler<IsTransitionSlotPublished, bool>
    {
        public List<IsTransitionSlotPublished> Received { get; } = [];

        public Task<Result<bool>> Handle(IsTransitionSlotPublished query, CancellationToken ct)
        {
            Received.Add(query);
            return Task.FromResult(failure is null ? Result<bool>.Success(true) : Result<bool>.Failure(failure));
        }
    }

    [Fact]
    public async Task IsSlotTaken_Should_AskTheCatalogWithThePosesAndTheKey_When_ContributionChecksAPlace()
    {
        var catalog = new FakeIsTransitionSlotPublished();
        var name = TransitionName.CreateOptional("Ninja Star").Value;

        (await new CatalogTransitions(catalog).IsSlotTaken(TransitionSlot.Of(StarToStar, name), Ct)).Value.ShouldBeTrue();

        catalog.Received.ShouldHaveSingleItem().ShouldBe(
            new IsTransitionSlotPublished(new PoseId(StarToStar.From.Value), new PoseId(StarToStar.To.Value), name!.Key));
    }

    [Fact]
    public async Task IsSlotTaken_Should_PassTheFailureOn_When_TheCatalogQueryFails()
    {
        var failure = new Error("catalog.unavailable", "Indisponible.");

        (await new CatalogTransitions(new FakeIsTransitionSlotPublished(failure)).IsSlotTaken(TransitionSlot.Of(StarToStar, name: null), Ct))
            .Error.ShouldBe(failure);
    }
}
