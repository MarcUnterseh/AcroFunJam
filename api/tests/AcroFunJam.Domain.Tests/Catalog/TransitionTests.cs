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

    private static readonly TagId Pop = new(Guid.NewGuid());
    private static readonly TagId Dynamic = new(Guid.NewGuid());
    private static readonly TagChoice PopChosen = new(TagSet.Of([Pop, Dynamic]), TagSet.Empty);
    private static readonly TagChoice NoTag = new(TagSet.Empty, TagSet.Empty);

    private static AcroFunJam.Domain.Common.Result<Transition> Publish(
        string? name = "Ninja Star", bool fromPublished = true, bool toPublished = true, bool slotTaken = false, PoseId? to = null,
        TagChoice? tags = null) =>
        Transition.Publish(
            AnId, Star, to ?? Star, Named(name), Advanced, TransitionDescription.CreateOptional("Rotation complète.").Value, tags ?? NoTag,
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
        transition.DomainEvents.ShouldHaveSingleItem().ShouldBe(new TransitionPublished(AnId, Star, Star, Named("Ninja Star"), TagSet.Empty, transition.SourceProposalId, Now));
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

    // --- Tags (story 8, ADR 0033) -------------------------------------------------------------

    [Fact]
    public void Publish_Should_CarryTheChosenTags_When_TheyAreInTheList()
    {
        var transition = Publish(tags: PopChosen).Value!;

        transition.Tags.ShouldBe(TagSet.Of([Pop, Dynamic]));
        transition.DomainEvents.OfType<TransitionPublished>().ShouldHaveSingleItem().Tags.ShouldBe(TagSet.Of([Pop, Dynamic]));
    }

    [Fact]
    public void Publish_Should_FailWithTagNotInList_When_AChosenTagIsNotInTheList_AfterThePosesAndBeforeThePlace()
    {
        var classique = new TagId(Guid.NewGuid());
        var notInList = new TagChoice(TagSet.Empty, TagSet.Of([classique]));

        var error = Publish(tags: notInList, slotTaken: true).Error.ShouldBeOfType<TagNotInListError>();

        error.Code.ShouldBe("catalog.tag-not-in-list");
        error.Tags.ShouldBe(TagSet.Of([classique]));
        Publish(tags: notInList, toPublished: false).Error.ShouldBe(CatalogErrors.ToPoseNotFound);
    }

    [Fact]
    public void Tag_Should_ReplaceTheTagsAndRaiseTransitionTagged_When_TheyAreInTheList()
    {
        var transition = Publish(tags: PopChosen).Value!;
        transition.ClearDomainEvents();
        var vrille = new TagId(Guid.NewGuid());

        transition.Tag(new TagChoice(TagSet.Of([vrille]), TagSet.Empty), Now).IsSuccess.ShouldBeTrue();

        transition.Tags.ShouldBe(TagSet.Of([vrille]));
        transition.DomainEvents.ShouldHaveSingleItem().ShouldBe(new TransitionTagged(AnId, TagSet.Of([vrille]), Now));
    }

    [Fact]
    public void Tag_Should_RemoveEveryTag_When_NoTagIsChosen()
    {
        var transition = Publish(tags: PopChosen).Value!;

        transition.Tag(NoTag, Now).IsSuccess.ShouldBeTrue();

        transition.Tags.ShouldBe(TagSet.Empty);
    }

    [Fact]
    public void Publish_Should_FailWithTagNotApplicable_When_AChosenTagDoesNotApplyToTransitions()
    {
        var counterbalance = new TagId(Guid.NewGuid());

        var error = Publish(tags: new TagChoice(TagSet.Empty, TagSet.Empty, TagSet.Of([counterbalance])))
            .Error.ShouldBeOfType<TagNotApplicableError>();

        error.Code.ShouldBe("catalog.tag-not-applicable");
        error.Tags.ShouldBe(TagSet.Of([counterbalance]));
    }

    [Fact]
    public void Tag_Should_FailWithTagNotApplicable_When_AChosenTagDoesNotApplyToTransitions()
    {
        var transition = Publish(tags: PopChosen).Value!;

        transition.Tag(new TagChoice(TagSet.Empty, TagSet.Empty, TagSet.Of([new TagId(Guid.NewGuid())])), Now)
            .Error.ShouldBeOfType<TagNotApplicableError>();
        transition.Tags.ShouldBe(TagSet.Of([Pop, Dynamic]));
    }

    [Fact]
    public void Tag_Should_FailWithTagNotInListAndKeepItsTags_When_AChosenTagIsNotInTheList()
    {
        var transition = Publish(tags: PopChosen).Value!;

        transition.Tag(new TagChoice(TagSet.Empty, TagSet.Of([new TagId(Guid.NewGuid())])), Now).Error.ShouldBeOfType<TagNotInListError>();

        transition.Tags.ShouldBe(TagSet.Of([Pop, Dynamic]));
    }

    [Fact]
    public void Rehydrate_Should_RestoreTheTags_When_LoadedFromStorage()
    {
        var transition = Transition.Rehydrate(
            AnId, Star, Star, Named("Ninja Star"), Advanced, description: null, TagSet.Of([Pop]), source: null, Now);

        transition.Tags.ShouldBe(TagSet.Of([Pop]));
        transition.DomainEvents.ShouldBeEmpty();
    }
}
