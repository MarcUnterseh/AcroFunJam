using AcroFunJam.Application.Catalog.GetPublishedGraph;
using AcroFunJam.Application.Catalog.GetTagNames;
using AcroFunJam.Application.Catalog.ListPublishedPoses;
using AcroFunJam.Application.Common;
using AcroFunJam.Application.FlowGeneration;
using AcroFunJam.Domain.Catalog;
using AcroFunJam.Domain.Common;
using AcroFunJam.Domain.FlowGeneration;
using AcroFunJam.Domain.SharedKernel;
using AcroFunJam.Infrastructure.ContextIntegration;

namespace AcroFunJam.Infrastructure.Tests.ContextIntegration;

/// <summary>Anti-corruption layer Flow generation → Catalog: the published graph, translated (story 9, ADR 0037).</summary>
public sealed class CatalogPublishedGraphTests
{
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    private static readonly NamedTag Pop = new(new TagId(Guid.NewGuid()), TagName.Create("pop").Value!);
    private static readonly NamedTag Dynamic = new(new TagId(Guid.NewGuid()), TagName.Create("dynamique").Value!);
    private static readonly NamedTag Lunar = new(new TagId(Guid.NewGuid()), TagName.Create("lunaire").Value!);

    private sealed class FakeGetPublishedGraph(PublishedCatalogGraph graph) : IQueryHandler<GetPublishedGraph, PublishedCatalogGraph>
    {
        public Task<Result<PublishedCatalogGraph>> Handle(GetPublishedGraph query, CancellationToken ct) =>
            Task.FromResult(Result<PublishedCatalogGraph>.Success(graph));
    }

    private static PublishedPoseSummary APose(string name, bool start, bool end, params NamedTag[] tags) =>
        new(new PoseId(Guid.NewGuid()), PoseName.Create(name).Value!, DifficultyLevel.Beginner, DifficultyLevel.Intermediate,
            FlowBoundaries.Create(start, end).Value!)
        {
            Tags = TagSet.Of(tags.Select(t => t.Id)),
        };

    [Fact]
    public async Task Read_Should_TranslateTheGraphAndItsDetails_When_TheCatalogPublishesIt()
    {
        var throne = APose("Throne", true, false);
        var leaf = APose("Folded Leaf", false, true, Lunar);
        var transition = new PublishedTransitionSummary(
            new TransitionId(Guid.NewGuid()), throne.Id, leaf.Id, TransitionName.CreateOptional("Pop to Leaf").Value,
            Difficulty.Create(DifficultyLevel.Intermediate, DifficultyLevel.Advanced).Value!, TransitionDescription.CreateOptional("Un élan.").Value,
            TagSet.Of([Pop.Id, Dynamic.Id]));
        var acl = new CatalogPublishedGraph(new FakeGetPublishedGraph(new PublishedCatalogGraph([throne, leaf], [transition], [Dynamic, Lunar, Pop])));

        var published = await acl.Read(Ct);

        var throneId = new FlowPoseId(throne.Id.Value);
        var leafId = new FlowPoseId(leaf.Id.Value);
        var transitionId = new FlowTransitionId(transition.Id.Value);
        published.Graph.ShouldSatisfyAllConditions(
            g => g.Poses.ShouldBe(
            [
                new FlowPose(throneId, throne.Flow, Difficulty.Create(DifficultyLevel.Beginner, DifficultyLevel.Intermediate).Value!, TagSet.Empty),
                new FlowPose(leafId, leaf.Flow, Difficulty.Create(DifficultyLevel.Beginner, DifficultyLevel.Intermediate).Value!, TagSet.Of([Lunar.Id])),
            ]),
            g => g.Transitions.ShouldBe([new FlowTransition(transitionId, throneId, leafId, transition.Difficulty, transition.Tags)]),
            g => g.TagsOfTheList.ShouldBe(TagSet.Of([Dynamic.Id, Lunar.Id, Pop.Id])));
        published.Details.Poses[leafId].ShouldSatisfyAllConditions(
            d => d.Name.Value.ShouldBe("Folded Leaf"),
            d => d.Tags.ShouldBe([new FlowTag(Lunar.Id, Lunar.Name)]));
        published.Details.Transitions[transitionId].ShouldSatisfyAllConditions(
            d => d.Name!.Value.ShouldBe("Pop to Leaf"),
            d => d.Description!.Value.ShouldBe("Un élan."),
            d => d.Tags.ShouldBe([new FlowTag(Dynamic.Id, Dynamic.Name), new FlowTag(Pop.Id, Pop.Name)]));
    }

    [Fact]
    public async Task Read_Should_LeaveOutOfThePresentationATagNoLongerInTheList_When_AnElementStillCarriesIt()
    {
        var removed = new TagId(Guid.NewGuid());
        var throne = APose("Throne", true, true) with { Tags = TagSet.Of([removed, Pop.Id]) };
        var acl = new CatalogPublishedGraph(new FakeGetPublishedGraph(new PublishedCatalogGraph([throne], [], [Pop])));

        var published = await acl.Read(Ct);

        published.Details.Poses[new FlowPoseId(throne.Id.Value)].Tags.ShouldBe([new FlowTag(Pop.Id, Pop.Name)]);
    }
}
