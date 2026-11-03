using AcroFunJam.Application.Catalog.ListPublishedPoses;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Application.Tests.Catalog;

public sealed class ListPublishedPosesHandlerTests
{
    [Fact]
    public async Task Handle_Should_ReturnPublishedPoses_When_CatalogContainsPoses()
    {
        // Arrange
        PublishedPoseSummary[] publishedPoses =
        [
            APublishedPose.Named("Throne").WithBaseDifficulty(DifficultyLevel.Beginner).WithFlyerDifficulty(DifficultyLevel.Discovery).Build(),
            APublishedPose.Named("Bird").WithBaseDifficulty(DifficultyLevel.Discovery).WithFlyerDifficulty(DifficultyLevel.Discovery).Build(),
            APublishedPose.Named("Star").WithBaseDifficulty(DifficultyLevel.Intermediate).WithFlyerDifficulty(DifficultyLevel.Advanced).Build(),
        ];
        var reader = new FakePublishedPosesReader(publishedPoses);
        var handler = new ListPublishedPosesHandler(reader);

        // Act
        var result = await handler.Handle(new ListPublishedPoses(), TestContext.Current.CancellationToken);

        // Assert
        result.IsSuccess.ShouldBeTrue();
        result.Value.ShouldBe(publishedPoses, ignoreOrder: true);
    }

    [Fact]
    public async Task Handle_Should_ReturnEmptyList_When_CatalogHasNoPose()
    {
        var handler = new ListPublishedPosesHandler(new FakePublishedPosesReader([]));

        var result = await handler.Handle(new ListPublishedPoses(), TestContext.Current.CancellationToken);

        result.IsSuccess.ShouldBeTrue();
        result.Value.ShouldBeEmpty();
    }

    [Fact]
    public async Task Handle_Should_ReturnPosesInCatalogOrder_When_ReaderReturnsThemUnordered()
    {
        var reader = new FakePublishedPosesReader(
            [
                APublishedPose.Named("Throne").Build(), APublishedPose.Named("Folded Leaf").Build(), APublishedPose.Named("bird").Build(),
                APublishedPose.Named("Handstand").Build(), APublishedPose.Named("Étoile").Build(), APublishedPose.Named("Hand-to-Hand").Build(),
            ]);
        var handler = new ListPublishedPosesHandler(reader);

        var result = await handler.Handle(new ListPublishedPoses(), TestContext.Current.CancellationToken);

        // Comparison key (ADR 0017): accents ignored, a hyphen counts as a space.
        result.Value.ShouldNotBeNull().Select(p => p.Name.Value)
            .ShouldBe(["bird", "Étoile", "Folded Leaf", "Hand-to-Hand", "Handstand", "Throne"]);
    }
}
