using AcroFunJam.Domain.Catalog;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Domain.Tests.Catalog;

/// <summary>A published transition of the catalog (story 7, ADR 0028, ADR 0029).</summary>
public sealed class TransitionTests
{
    private static readonly DateTimeOffset Now = new(2026, 11, 13, 10, 0, 0, TimeSpan.Zero);
    private static readonly TransitionId AnId = new(Guid.NewGuid());
    private static readonly PoseId Star = new(Guid.NewGuid());
    private static readonly PoseId Bird = new(Guid.NewGuid());
    private static readonly Difficulty Advanced = Difficulty.Create(DifficultyLevel.Advanced, DifficultyLevel.Advanced).Value!;

    private static TransitionName? Named(string? name) => TransitionName.CreateOptional(name).Value;

    private static AcroFunJam.Domain.Common.Result<Transition> Publish(
        string? name = "Ninja Star", bool fromPublished = true, bool toPublished = true, bool slotTaken = false, PoseId? to = null) =>
        Transition.Publish(
            AnId, Star, to ?? Star, Named(name), Advanced, TransitionDescription.CreateOptional("Rotation complète.").Value,
            new SourceProposalId(Guid.NewGuid()), fromPublished, toPublished, slotTaken, Now);

    [Fact]
    public void Publish_Should_PublishTheTransitionAndRaiseTransitionPublished_When_ItsPosesArePublishedAndItsPlaceFree()
    {
        var transition = Publish().Value!;

        transition.ShouldSatisfyAllConditions(
            t => t.Id.ShouldBe(AnId),
            t => t.FromPose.ShouldBe(Star),
            t => t.ToPose.ShouldBe(Star),
            t => t.Name.ShouldBe(Named("Ninja Star")),
            t => t.Difficulty.ShouldBe(Advanced),
            t => t.Description!.Value.ShouldBe("Rotation complète."),
            t => t.PublishedAt.ShouldBe(Now));
        transition.DomainEvents.ShouldHaveSingleItem().ShouldBe(new TransitionPublished(AnId, Star, Star, Named("Ninja Star"), transition.SourceProposalId, Now));
    }

    [Fact]
    public void Publish_Should_FailWithFromPoseNotFound_When_TheStartPoseIsNotPublished()
    {
        Publish(fromPublished: false, toPublished: false).Error.ShouldBe(CatalogErrors.FromPoseNotFound);
    }

    [Fact]
    public void Publish_Should_FailWithToPoseNotFound_When_TheEndPoseIsNotPublished()
    {
        Publish(toPublished: false, to: Bird).Error.ShouldBe(CatalogErrors.ToPoseNotFound);
    }

    [Fact]
    public void Publish_Should_FailWithTransitionNameTaken_When_ANamedTransitionTakesAPlaceAlreadyTaken()
    {
        Publish(slotTaken: true).Error.ShouldBe(CatalogErrors.TransitionNameTaken);
    }

    [Fact]
    public void Publish_Should_FailWithUnnamedTransitionTaken_When_AnUnnamedTransitionTakesAPlaceAlreadyTaken()
    {
        Publish(name: null, slotTaken: true).Error.ShouldBe(CatalogErrors.UnnamedTransitionTaken);
    }
}
