using AcroFunJam.Domain.Common;
using AcroFunJam.Domain.FlowGeneration;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Domain.Tests.FlowGeneration;

/// <summary>The generator of flows (story 9, G1 to G11, K1 to K8, ADR 0037): a random search in the published graph.</summary>
public sealed class FlowGeneratorTests
{
    private static readonly Difficulty Intermediate = GraphBuilder.Of(DifficultyLevel.Intermediate, DifficultyLevel.Intermediate);

    private static FlowCriteria Criteria(int length, string @base = "advanced", string flyer = "advanced", TagSet? requested = null, TagSet? excluded = null) =>
        FlowCriteria.Create(length, @base, flyer, requested ?? TagSet.Empty, excluded ?? TagSet.Empty).Value!;

    /// <summary>Generates with a source that keeps the order of the candidates, unless the test scripts the draws.</summary>
    private static (GraphBuilder Graph, Result<Flow> Flow) Generate(
        GraphBuilder graph, FlowCriteria criteria, IRandomSource? random = null, int budget = FlowGenerator.DefaultBudget) =>
        (graph, FlowGenerator.Generate(graph.Build(), criteria, random ?? new ScriptedRandomSource(), budget));

    private static IReadOnlyList<string> Names((GraphBuilder Graph, Result<Flow> Flow) generated) =>
        generated.Graph.NamesOf(generated.Flow.Value.ShouldNotBeNull());

    private static Error? ErrorOf((GraphBuilder Graph, Result<Flow> Flow) generated) => generated.Flow.Error;

    // --- An executable flow (G1, G2, G4) ------------------------------------------------------------

    [Fact]
    public void Generate_Should_ReturnTheOnlyFlow_When_OneTransitionLinksAStartPoseToAnEndPose()
    {
        var generated = Generate(new GraphBuilder().Pose("Throne", start: true).Pose("Bird", end: true).Transition("Throne→Bird", "Throne", "Bird"), Criteria(1));

        Names(generated).ShouldBe(["Throne→Bird"]);
        generated.Flow.Value!.ShouldSatisfyAllConditions(
            flow => flow.Start.ShouldBe(GraphBuilder.PoseId("Throne")),
            flow => flow.Steps.ShouldHaveSingleItem().ShouldSatisfyAllConditions(
                step => step.Number.ShouldBe(1),
                step => step.From.ShouldBe(GraphBuilder.PoseId("Throne")),
                step => step.To.ShouldBe(GraphBuilder.PoseId("Bird")),
                step => step.IsWashingMachine.ShouldBeFalse()));
    }

    [Fact]
    public void Generate_Should_NeverStartOnAPose_When_ItCannotStartAFlow() =>
        Names(Generate(
            new GraphBuilder().Pose("Bird", end: true).Pose("Throne", start: true, end: true)
                .Transition("Bird→Throne", "Bird", "Throne").Transition("Throne→Bird", "Throne", "Bird"),
            Criteria(1))).ShouldBe(["Throne→Bird"]);

    [Fact]
    public void Generate_Should_NeverEndOnAPose_When_ItCannotEndAFlow() =>
        Names(Generate(
            new GraphBuilder().Pose("Throne", start: true).Pose("Star").Pose("Bird", end: true)
                .Transition("Throne→Star", "Throne", "Star").Transition("Throne→Bird", "Throne", "Bird"),
            Criteria(1))).ShouldBe(["Throne→Bird"]);

    [Fact]
    public void Generate_Should_ReturnAFlowOfExactlyTheRequestedLength_When_ShorterFlowsAlsoExist() =>
        Names(Generate(
            new GraphBuilder().Pose("Throne", start: true).Pose("Bird", end: true).Pose("Star", end: true)
                .Transition("Throne→Bird", "Throne", "Bird").Transition("Bird→Star", "Bird", "Star"),
            Criteria(2))).ShouldBe(["Throne→Bird", "Bird→Star"]);

    [Fact]
    public void Generate_Should_FailWithCriteriaTooRestrictive_When_OnlyShorterFlowsExist() =>
        ErrorOf(Generate(
            new GraphBuilder().Pose("Throne", start: true).Pose("Bird", end: true).Transition("Throne→Bird", "Throne", "Bird"),
            Criteria(2))).ShouldBe(FlowGenerationErrors.CriteriaTooRestrictive);

    // --- The catalog cannot give any flow (G11) -------------------------------------------------------

    [Fact]
    public void Generate_Should_FailWithCatalogInsufficient_When_TheGraphHasNoPose() =>
        ErrorOf(Generate(new GraphBuilder(), Criteria(1))).ShouldBe(FlowGenerationErrors.CatalogInsufficient);

    [Fact]
    public void Generate_Should_FailWithCatalogInsufficient_When_TheGraphHasNoTransition() =>
        ErrorOf(Generate(new GraphBuilder().Pose("Throne", start: true, end: true), Criteria(1))).ShouldBe(FlowGenerationErrors.CatalogInsufficient);

    [Fact]
    public void Generate_Should_FailWithCatalogInsufficient_When_NoPoseCanStartAFlow() =>
        ErrorOf(Generate(
            new GraphBuilder().Pose("Throne").Pose("Bird", end: true).Transition("Throne→Bird", "Throne", "Bird"),
            Criteria(1))).ShouldBe(FlowGenerationErrors.CatalogInsufficient);

    [Fact]
    public void Generate_Should_FailWithCatalogInsufficient_When_TheShortestFlowNeedsMoreThanTenTransitions()
    {
        var graph = new GraphBuilder().Pose("P0", start: true);
        for (var i = 1; i <= 11; i++) graph.Pose($"P{i}", end: i == 11).Transition($"T{i}", $"P{i - 1}", $"P{i}");

        ErrorOf(Generate(graph, Criteria(10))).ShouldBe(FlowGenerationErrors.CatalogInsufficient);
    }

    // --- Poses and transitions along the flow (G3, G7, G8, G9) -------------------------------------------

    [Fact]
    public void Generate_Should_PassThroughAPose_When_ItCanNeitherStartNorEndAFlow() =>
        Names(Generate(
            new GraphBuilder().Pose("Throne", start: true).Pose("Star").Pose("Bird", end: true)
                .Transition("Throne→Star", "Throne", "Star").Transition("Star→Bird", "Star", "Bird"),
            Criteria(2))).ShouldBe(["Throne→Star", "Star→Bird"]);

    [Fact]
    public void Generate_Should_EndOnItsStartPose_When_ItCanEndAFlow() =>
        Names(Generate(
            new GraphBuilder().Pose("Throne", start: true, end: true).Pose("Bird")
                .Transition("Throne→Bird", "Throne", "Bird").Transition("Bird→Throne", "Bird", "Throne"),
            Criteria(2))).ShouldBe(["Throne→Bird", "Bird→Throne"]);

    [Fact]
    public void Generate_Should_ReturnAWashingMachine_When_ItIsTheOnlyTransition()
    {
        var generated = Generate(new GraphBuilder().Pose("Star", start: true, end: true).Transition("Ninja Star", "Star", "Star"), Criteria(1));

        Names(generated).ShouldBe(["Ninja Star"]);
        generated.Flow.Value!.Steps.ShouldHaveSingleItem().IsWashingMachine.ShouldBeTrue();
    }

    [Fact]
    public void Generate_Should_FailWithCriteriaTooRestrictive_When_TheFlowWouldReuseATransition() =>
        ErrorOf(Generate(new GraphBuilder().Pose("Star", start: true, end: true).Transition("Ninja Star", "Star", "Star"), Criteria(2)))
            .ShouldBe(FlowGenerationErrors.CriteriaTooRestrictive);

    [Fact]
    public void Generate_Should_UseAnotherTransitionBetweenTheSamePoses_When_SeveralLinkThemInTheSameDirection() =>
        Names(Generate(
            new GraphBuilder().Pose("Throne", start: true).Pose("Bird", end: true)
                .Transition("Pop to Bird", "Throne", "Bird").Transition("Retour", "Bird", "Throne").Transition("Throne→Bird", "Throne", "Bird"),
            Criteria(3))).ShouldBe(["Pop to Bird", "Retour", "Throne→Bird"]);

    // --- Chance (G6) ---------------------------------------------------------------------------------

    [Fact]
    public void Generate_Should_GiveEachPossibleFlow_When_TheRandomSourceDrawsIt()
    {
        var graph = new GraphBuilder().Pose("Throne", start: true).Pose("Bird", end: true).Pose("Star", end: true)
            .Transition("Throne→Bird", "Throne", "Bird").Transition("Throne→Star", "Throne", "Star");

        var flows = Enumerable.Range(0, 2).Select(draw => Names(Generate(graph, Criteria(1), new ScriptedRandomSource(draw)))[0]).ToHashSet();

        flows.ShouldBe(["Throne→Bird", "Throne→Star"], ignoreOrder: true);
    }

    [Fact]
    public void Generate_Should_BacktrackToAnotherBranch_When_TheFirstBranchIsADeadEnd() =>
        Names(Generate(
            new GraphBuilder().Pose("Throne", start: true).Pose("Bird").Pose("Star", end: true)
                .Transition("Washing", "Throne", "Throne").Transition("To Bird", "Throne", "Bird")
                .Transition("Back", "Bird", "Throne").Transition("To Star", "Throne", "Star"),
            Criteria(3))).ShouldBe(["To Bird", "Back", "To Star"]);

    [Fact]
    public void Generate_Should_FailWithCriteriaTooRestrictive_When_TheExplorationBudgetIsExhausted() =>
        ErrorOf(Generate(
            new GraphBuilder().Pose("Throne", start: true).Pose("Bird").Pose("Star", end: true)
                .Transition("Washing", "Throne", "Throne").Transition("To Bird", "Throne", "Bird")
                .Transition("Back", "Bird", "Throne").Transition("To Star", "Throne", "Star"),
            Criteria(3), budget: 2)).ShouldBe(FlowGenerationErrors.CriteriaTooRestrictive);

    // --- Ceilings (K1, K2) ---------------------------------------------------------------------------

    private static GraphBuilder TwoWaysToBird(Difficulty? first = null, Difficulty? bird = null, Difficulty? throne = null) =>
        new GraphBuilder().Pose("Throne", start: true, difficulty: throne).Pose("Bird", end: true, difficulty: bird).Pose("Star", end: true)
            .Transition("Pop to Bird", "Throne", "Bird", first).Transition("Throne→Star", "Throne", "Star");

    [Fact]
    public void Generate_Should_SkipATransition_When_ItExceedsACeiling() =>
        Names(Generate(TwoWaysToBird(first: Intermediate), Criteria(1, "beginner", "beginner")))
            .ShouldBe(["Throne→Star"]);

    [Fact]
    public void Generate_Should_SkipAnArrivalPose_When_ItExceedsACeiling() =>
        Names(Generate(TwoWaysToBird(bird: Intermediate), Criteria(1, "beginner", "beginner")))
            .ShouldBe(["Throne→Star"]);

    [Fact]
    public void Generate_Should_FailWithCriteriaTooRestrictive_When_TheStartPoseExceedsACeiling() =>
        ErrorOf(Generate(TwoWaysToBird(throne: Intermediate), Criteria(1, "beginner", "beginner")))
            .ShouldBe(FlowGenerationErrors.CriteriaTooRestrictive);

    // --- Requested and excluded tags (K4, K6, K7, K8) ----------------------------------------------------

    [Fact]
    public void Generate_Should_KeepAStep_When_ItsTransitionCarriesARequestedTag()
    {
        var graph = new GraphBuilder().Pose("Throne", start: true).Pose("Bird", end: true).Pose("Star", end: true)
            .Transition("Throne→Star", "Throne", "Star").Transition("Pop to Bird", "Throne", "Bird", null, "pop");

        Names(Generate(graph, Criteria(1, requested: TagSet.Of([graph.Tag("pop")])))).ShouldBe(["Pop to Bird"]);
    }

    [Fact]
    public void Generate_Should_KeepAStep_When_OnlyItsArrivalPoseCarriesARequestedTag()
    {
        var graph = new GraphBuilder().Pose("Bird", start: true).Pose("Folded Leaf", end: true, tags: ["lunaire"]).Pose("Throne", end: true)
            .Transition("Bird→Throne", "Bird", "Throne").Transition("Bird→Folded Leaf", "Bird", "Folded Leaf");

        Names(Generate(graph, Criteria(1, requested: TagSet.Of([graph.Tag("lunaire")])))).ShouldBe(["Bird→Folded Leaf"]);
    }

    [Fact]
    public void Generate_Should_FailWithCriteriaTooRestrictive_When_OnlyTheStartPoseCarriesTheRequestedTag()
    {
        var graph = new GraphBuilder().Pose("Folded Leaf", start: true, tags: ["lunaire"]).Pose("Bird", end: true)
            .Transition("Folded Leaf→Bird", "Folded Leaf", "Bird");

        ErrorOf(Generate(graph, Criteria(1, requested: TagSet.Of([graph.Tag("lunaire")])))).ShouldBe(FlowGenerationErrors.CriteriaTooRestrictive);
    }

    [Fact]
    public void Generate_Should_SkipATransition_When_ItCarriesAnExcludedTag()
    {
        var graph = TwoWaysToBird();
        graph.Transition("Pop to Bird", "Throne", "Bird", null, "inversion");

        Names(Generate(graph, Criteria(1, excluded: TagSet.Of([graph.Tag("inversion")])))).ShouldBe(["Throne→Star"]);
    }

    [Fact]
    public void Generate_Should_SkipAPose_When_ItCarriesAnExcludedTag()
    {
        var graph = TwoWaysToBird();
        graph.Pose("Bird", end: true, tags: ["inversion"]);

        Names(Generate(graph, Criteria(1, excluded: TagSet.Of([graph.Tag("inversion")])))).ShouldBe(["Throne→Star"]);
    }

    [Fact]
    public void Generate_Should_SkipAPopTransition_When_DynamiqueIsExcluded()
    {
        // The published tags are completed by the list (ADR 0033): « pop » comes with « dynamique ».
        var graph = TwoWaysToBird();
        graph.Transition("Pop to Bird", "Throne", "Bird", null, "pop", "dynamique");

        Names(Generate(graph, Criteria(1, excluded: TagSet.Of([graph.Tag("dynamique")])))).ShouldBe(["Throne→Star"]);
    }

    [Fact]
    public void Generate_Should_SkipAnArrivalPoseCarryingARequestedTag_When_ItAlsoCarriesAnExcludedOne()
    {
        var graph = new GraphBuilder().Pose("Bird", start: true).Pose("Folded Leaf", end: true, tags: ["lunaire", "inversion"])
            .Pose("Throne", end: true, tags: ["lunaire"])
            .Transition("Bird→Folded Leaf", "Bird", "Folded Leaf").Transition("Bird→Throne", "Bird", "Throne");

        Names(Generate(
            graph,
            Criteria(1, requested: TagSet.Of([graph.Tag("lunaire")]), excluded: TagSet.Of([graph.Tag("inversion")])))).ShouldBe(["Bird→Throne"]);
    }

    [Fact]
    public void Generate_Should_FailWithCriteriaTooRestrictive_When_TheSameTagIsRequestedAndExcluded()
    {
        var graph = TwoWaysToBird();
        graph.Transition("Pop to Bird", "Throne", "Bird", null, "pop");
        var pop = TagSet.Of([graph.Tag("pop")]);

        ErrorOf(Generate(graph, Criteria(1, requested: pop, excluded: pop))).ShouldBe(FlowGenerationErrors.CriteriaTooRestrictive);
    }

    [Fact]
    public void Generate_Should_FailWithTagsNotInList_When_ARequestedOrExcludedTagIsNotInTheList()
    {
        var classique = new TagId(Guid.NewGuid());
        var envol = new TagId(Guid.NewGuid());

        ErrorOf(Generate(TwoWaysToBird(), Criteria(1, requested: TagSet.Of([classique]), excluded: TagSet.Of([envol]))))
            .ShouldBeOfType<TagsNotInListError>().Tags.ShouldBe(TagSet.Of([classique, envol]));
    }

    [Fact]
    public void Generate_Should_FailWithTagsNotInList_When_TheCatalogIsAlsoInsufficient() =>
        ErrorOf(Generate(new GraphBuilder(), Criteria(1, requested: TagSet.Of([new TagId(Guid.NewGuid())]))))
            .ShouldBeOfType<TagsNotInListError>();
}
