using AcroFunJam.Application.Catalog.GetPublishedGraph;
using AcroFunJam.Application.Catalog.GetTagNames;
using AcroFunJam.Application.Catalog.ListPublishedPoses;
using AcroFunJam.Domain.Catalog;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Application.Tests.Catalog;

/// <summary>The published graph the catalog offers to the generation of flows (story 9, ADR 0037): poses, transitions, tags of the list.</summary>
public sealed class GetPublishedGraphHandlerTests
{
    private sealed class FakePublishedGraphReader(PublishedGraphElements elements) : IPublishedGraphReader
    {
        public Task<PublishedGraphElements> Read(CancellationToken ct) => Task.FromResult(elements);
    }

    private static TagName Name(string name) => TagName.Create(name).Value!;

    [Fact]
    public async Task Handle_Should_GiveThePublishedPosesTransitionsAndTagsOfTheList_When_TheReaderReadsThemTogether()
    {
        var throne = APublishedPose.Named("Throne").Build();
        var bird = APublishedPose.Named("Bird").Build();
        var transition = new PublishedTransitionSummary(
            new TransitionId(Guid.NewGuid()), throne.Id, bird.Id, null, Difficulty.FromCodes("beginner", "beginner").Value!, null, TagSet.Empty);
        NamedTag[] tags = [new(new TagId(Guid.NewGuid()), Name("lunaire")), new(new TagId(Guid.NewGuid()), Name("pop"))];
        var handler = new GetPublishedGraphHandler(new FakePublishedGraphReader(new PublishedGraphElements([throne, bird], [transition], tags)));

        var graph = (await handler.Handle(new GetPublishedGraph(), TestContext.Current.CancellationToken)).Value!;

        graph.ShouldSatisfyAllConditions(
            g => g.Poses.ShouldBe([throne, bird]),
            g => g.Transitions.ShouldBe([transition]),
            g => g.TagsOfTheList.ShouldBe(tags));
    }
}
