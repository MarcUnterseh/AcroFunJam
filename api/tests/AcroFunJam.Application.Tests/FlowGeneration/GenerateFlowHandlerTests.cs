using AcroFunJam.Application.FlowGeneration;
using AcroFunJam.Application.FlowGeneration.GenerateFlow;
using AcroFunJam.Domain.FlowGeneration;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Application.Tests.FlowGeneration;

/// <summary>Generating a flow (story 9, ADR 0037): the criteria, the published graph, the generator, then the flow as presented.</summary>
public sealed class GenerateFlowHandlerTests
{
    private static readonly Difficulty Beginner = Difficulty.FromCodes("beginner", "beginner").Value!;
    private static readonly Difficulty Intermediate = Difficulty.FromCodes("intermediate", "beginner").Value!;

    private static readonly FlowPoseId Throne = new(Guid.NewGuid());
    private static readonly FlowPoseId Star = new(Guid.NewGuid());
    private static readonly FlowTransitionId PopToStar = new(Guid.NewGuid());
    private static readonly FlowTransitionId NinjaStar = new(Guid.NewGuid());
    private static readonly FlowTag Pop = new(new TagId(Guid.NewGuid()), TagName.Create("pop").Value!);
    private static readonly FlowTag Dynamic = new(new TagId(Guid.NewGuid()), TagName.Create("dynamique").Value!);

    private sealed class FakePublishedGraphSource(PublishedGraph graph) : IPublishedGraphSource
    {
        public int Reads { get; private set; }

        public Task<PublishedGraph> Read(CancellationToken ct)
        {
            Reads++;
            return Task.FromResult(graph);
        }
    }

    /// <summary>Keeps the order of the candidates.</summary>
    private sealed class FirstCandidate : IRandomSource
    {
        public int NextIndex(int count) => count - 1;
    }

    /// <summary>Throne (start) → Star (start, end, intermediate base) by « Pop to Star », then the washing machine « Ninja Star ».</summary>
    private static PublishedGraph Catalog()
    {
        var graph = new FlowGraph(
            [
                new FlowPose(Throne, FlowBoundaries.Create(true, false).Value!, Beginner, TagSet.Empty),
                new FlowPose(Star, FlowBoundaries.Create(false, true).Value!, Intermediate, TagSet.Empty),
            ],
            [
                new FlowTransition(PopToStar, Throne, Star, Beginner, TagSet.Of([Pop.Id, Dynamic.Id])),
                new FlowTransition(NinjaStar, Star, Star, Beginner, TagSet.Empty),
            ],
            TagSet.Of([Pop.Id, Dynamic.Id]));
        var details = new FlowElementDetails(
            new Dictionary<FlowPoseId, FlowPoseDetails>
            {
                [Throne] = new(PoseName.Create("Throne").Value!, []),
                [Star] = new(PoseName.Create("Star").Value!, []),
            },
            new Dictionary<FlowTransitionId, FlowTransitionDetails>
            {
                [PopToStar] = new(TransitionName.CreateOptional("Pop to Star").Value, TransitionDescription.CreateOptional("Un élan.").Value, [Dynamic, Pop]),
                [NinjaStar] = new(null, null, []),
            });
        return new PublishedGraph(graph, details);
    }

    private static Task<Domain.Common.Result<GeneratedFlow>> Handle(GenerateFlow query, FakePublishedGraphSource? source = null) =>
        new GenerateFlowHandler(source ?? new FakePublishedGraphSource(Catalog()), new FirstCandidate())
            .Handle(query, TestContext.Current.CancellationToken);

    [Fact]
    public async Task Handle_Should_PresentTheFlow_When_OneMatchesTheCriteria()
    {
        var flow = (await Handle(new GenerateFlow(2, "intermediate", "beginner"))).Value!;

        flow.Start.ShouldSatisfyAllConditions(
            start => start.Id.ShouldBe(Throne),
            start => start.Name.Value.ShouldBe("Throne"),
            start => start.Difficulty.ShouldBe(Beginner),
            start => start.Tags.ShouldBeEmpty());
        flow.Steps.Count.ShouldBe(2);
        flow.Steps[0].ShouldSatisfyAllConditions(
            step => step.Number.ShouldBe(1),
            step => step.IsWashingMachine.ShouldBeFalse(),
            step => step.Transition.Id.ShouldBe(PopToStar),
            step => step.Transition.Name!.Value.ShouldBe("Pop to Star"),
            step => step.Transition.Description!.Value.ShouldBe("Un élan."),
            step => step.Transition.Difficulty.ShouldBe(Beginner),
            step => step.Transition.Tags.ShouldBe([Dynamic, Pop]),
            step => step.Arrival.Id.ShouldBe(Star),
            step => step.Arrival.Name.Value.ShouldBe("Star"),
            step => step.Arrival.Difficulty.ShouldBe(Intermediate));
        flow.Steps[1].ShouldSatisfyAllConditions(
            step => step.Number.ShouldBe(2),
            step => step.IsWashingMachine.ShouldBeTrue(),
            step => step.Transition.Name.ShouldBeNull(),
            step => step.Transition.Description.ShouldBeNull(),
            step => step.Arrival.Id.ShouldBe(Star));
    }

    [Fact]
    public async Task Handle_Should_RefuseTheCriteriaWithoutReadingTheCatalog_When_TheyAreInvalid()
    {
        var source = new FakePublishedGraphSource(Catalog());

        var result = await Handle(new GenerateFlow(11, "beginner", "beginner"), source);

        result.Error.ShouldBe(FlowGenerationErrors.LengthOutOfRange);
        source.Reads.ShouldBe(0);
    }

    [Fact]
    public async Task Handle_Should_FailWithCriteriaTooRestrictive_When_TheCeilingsLeaveNoFlow() =>
        (await Handle(new GenerateFlow(1, "beginner", "beginner"))).Error.ShouldBe(FlowGenerationErrors.CriteriaTooRestrictive);

    [Fact]
    public async Task Handle_Should_TellTheTagsNotInTheList_When_ARequestedOrExcludedOneIsNot()
    {
        var unknown = new TagId(Guid.NewGuid());

        var result = await Handle(new GenerateFlow(1, "advanced", "advanced", RequestedTagIds: [Pop.Id], ExcludedTagIds: [unknown]));

        result.Error.ShouldBeOfType<TagsNotInListError>().Tags.ShouldBe(TagSet.Of([unknown]));
    }

    [Fact]
    public async Task Handle_Should_ApplyTheRequestedTags_When_SomeAreRequested() =>
        (await Handle(new GenerateFlow(2, "advanced", "advanced", RequestedTagIds: [Dynamic.Id]))).Error
            .ShouldBe(FlowGenerationErrors.CriteriaTooRestrictive);

    [Fact]
    public async Task Handle_Should_ApplyTheExcludedTags_When_SomeAreExcluded() =>
        (await Handle(new GenerateFlow(1, "advanced", "advanced", ExcludedTagIds: [Pop.Id]))).Error
            .ShouldBe(FlowGenerationErrors.CriteriaTooRestrictive);
}
