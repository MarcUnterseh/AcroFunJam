using AcroFunJam.Domain.Catalog;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Domain.Tests.Catalog;

/// <summary>What the tags of the list apply to (story 9a, A1 to A7, A9, ADR 0035).</summary>
public sealed class TagListScopeTests
{
    private static readonly DateTimeOffset Now = new(2026, 11, 18, 10, 0, 0, TimeSpan.Zero);

    private static TagName Name(string name) => TagName.Create(name).Value!;

    private static TagDescription Description(string description) => TagDescription.Create(description).Value!;

    private static TagId NewId() => new(Guid.NewGuid());

    private static TagId IdOf(TagList list, string name) => list.Tags.Single(t => t.Name.Value == name).Id;

    private static Tag TagNamed(TagList list, string name) => list.Tags.Single(t => t.Name.Value == name);

    private static TagList Seeded()
    {
        var list = TagList.Seed(InitialTagList.Current, NewId, Now);
        list.ClearDomainEvents();
        return list;
    }

    // --- Seeding (A1, A2) ---------------------------------------------------------------------

    [Fact]
    public void Seed_Should_MakeOnlyInversionAndLunarApplyToThePoses_When_TheCurrentRevisionIsSeeded()
    {
        var list = TagList.Seed(InitialTagList.Current, NewId, Now);

        list.Tags.Select(t => (t.Name.Value, t.Scope)).ShouldBe([
            ("dynamique", TagScope.Transitions), ("icarien", TagScope.Transitions), ("inversion", TagScope.PosesAndTransitions),
            ("lunaire", TagScope.PosesAndTransitions), ("pop", TagScope.Transitions), ("vrille", TagScope.Transitions),
            ("whip", TagScope.Transitions)]);
        list.SeedRevision.ShouldBe(InitialTagList.Current.Number);
    }

    [Fact]
    public void Seed_Should_DescribeInversionAndLunarForPosesAndTransitions_When_TheCurrentRevisionIsSeeded()
    {
        var list = TagList.Seed(InitialTagList.Current, NewId, Now);

        TagNamed(list, "inversion").Description.Value.ShouldBe(
            "La tête du flyer est plus basse que ses hanches, dans la pose ou à un moment de la transition. Ex. : Candlestick, Straddle Bat.");
        TagNamed(list, "lunaire").Description.Value.ShouldBe(
            "Pratique thérapeutique : le flyer, détendu et passif, se laisse porter et étirer par la base ; les passages se font lentement. Ex. : Folded Leaf, Straddle Bat.");
    }

    [Fact]
    public void Seed_Should_ApplyEveryTagToTheTransitions_When_TheFirstRevisionIsSeeded()
    {
        var list = TagList.Seed(InitialTagList.Revision(1), NewId, Now);

        list.Tags.ShouldAllBe(t => t.Scope == TagScope.Transitions);
        TagNamed(list, "inversion").Description.Value.ShouldBe("Le flyer passe la tête en bas pendant la transition.");
        list.SeedRevision.ShouldBe(1);
    }

    [Fact]
    public void Upgrade_Should_ExtendInversionAndLunarAndGiveThemTheirNewDescriptions_When_TheListWasSeededAtTheFirstRevision()
    {
        var list = TagList.Seed(InitialTagList.Revision(1), NewId, Now);
        list.ClearDomainEvents();

        list.Upgrade(InitialTagList.Current, Now).ShouldBeTrue();

        TagNamed(list, "inversion").Scope.ShouldBe(TagScope.PosesAndTransitions);
        TagNamed(list, "lunaire").Scope.ShouldBe(TagScope.PosesAndTransitions);
        TagNamed(list, "pop").Scope.ShouldBe(TagScope.Transitions);
        TagNamed(list, "inversion").Description.ShouldBe(InitialTagList.Current.Tags.Single(t => t.Name.Value == "inversion").Description);
        list.SeedRevision.ShouldBe(InitialTagList.Current.Number);
        list.DomainEvents.ShouldHaveSingleItem().ShouldBe(new TagListUpgraded(TagListId.Catalog, InitialTagList.Current.Number, Now));
    }

    [Fact]
    public void Upgrade_Should_KeepADescriptionChangedByAValidator_When_TheListIsUpgraded()
    {
        var list = TagList.Seed(InitialTagList.Revision(1), NewId, Now);
        list.Describe(IdOf(list, "lunaire"), Description("Le flyer se laisse porter, détendu."), Now);

        list.Upgrade(InitialTagList.Current, Now);

        TagNamed(list, "lunaire").Description.Value.ShouldBe("Le flyer se laisse porter, détendu.");
        TagNamed(list, "lunaire").Scope.ShouldBe(TagScope.PosesAndTransitions);
    }

    [Fact]
    public void Upgrade_Should_LeaveATagAddedByAValidatorUnchanged_When_TheListIsUpgraded()
    {
        var list = TagList.Seed(InitialTagList.Revision(1), NewId, Now);
        var salto = NewId();
        list.Add(salto, Name("salto"), Description("Le flyer fait un tour complet tête en bas."), TagScope.Transitions, Now);

        list.Upgrade(InitialTagList.Current, Now);

        list.Tags.Single(t => t.Id == salto).Scope.ShouldBe(TagScope.Transitions);
    }

    [Fact]
    public void Upgrade_Should_DoNothing_When_TheListIsAlreadyAtTheRevision()
    {
        var list = Seeded();

        list.Upgrade(InitialTagList.Current, Now).ShouldBeFalse();

        list.DomainEvents.ShouldBeEmpty();
    }

    [Fact]
    public void Upgrade_Should_DoNothing_When_TheListWasNeverSeeded()
    {
        var list = TagList.Empty();

        list.Upgrade(InitialTagList.Current, Now).ShouldBeFalse();

        list.SeedRevision.ShouldBeNull();
    }

    // --- Adding (A3) --------------------------------------------------------------------------

    [Theory]
    [InlineData(TagScope.Poses)]
    [InlineData(TagScope.Transitions)]
    [InlineData(TagScope.PosesAndTransitions)]
    public void Add_Should_KeepWhatTheTagAppliesTo_When_ItIsAdded(TagScope scope)
    {
        var list = TagList.Empty();
        var id = NewId();

        var tag = list.Add(id, Name("contrepoids"), Description("Base et flyer s'équilibrent."), scope, Now).Value!;

        tag.Scope.ShouldBe(scope);
        list.DomainEvents.ShouldHaveSingleItem().ShouldBe(new TagAdded(id, Name("contrepoids"), scope, Now));
    }

    // --- Choosing for a target (A9, D3, E1) ---------------------------------------------------

    [Fact]
    public void Choose_Should_TellTheTagsThatDoNotApplyToTheTarget_When_TheyAreChosen()
    {
        var list = Seeded();

        var choice = list.Choose([IdOf(list, "lunaire"), IdOf(list, "pop")], TagTarget.Pose);

        choice.Tags.ShouldBe(TagSet.Of([IdOf(list, "lunaire")]));
        choice.NotApplicable.ShouldBe(TagSet.Of([IdOf(list, "pop")]));
        choice.NotInList.ShouldBe(TagSet.Empty);
        choice.IsValid.ShouldBeFalse();
    }

    [Fact]
    public void Choose_Should_ChooseEveryApplicableTagWithTheTagsTheyImply_When_TheTargetIsATransition()
    {
        var list = Seeded();

        var choice = list.Choose([IdOf(list, "pop"), IdOf(list, "lunaire")], TagTarget.Transition);

        choice.Tags.ShouldBe(TagSet.Of([IdOf(list, "pop"), IdOf(list, "dynamique"), IdOf(list, "lunaire")]));
        choice.IsValid.ShouldBeTrue();
    }

    [Fact]
    public void Choose_Should_RefuseATagReservedToThePoses_When_TheTargetIsATransition()
    {
        var list = Seeded();
        var counterbalance = NewId();
        list.Add(counterbalance, Name("contrepoids"), Description("Base et flyer s'équilibrent."), TagScope.Poses, Now);

        var choice = list.Choose([counterbalance], TagTarget.Transition);

        choice.NotApplicable.ShouldBe(TagSet.Of([counterbalance]));
        choice.IsValid.ShouldBeFalse();
    }

    // --- Changing the scope (A4, A5) ----------------------------------------------------------

    [Fact]
    public void ChangeScope_Should_ExtendTheTagAndRaiseTagScopeChanged_When_NothingForbidsIt()
    {
        var list = Seeded();
        var vrille = IdOf(list, "vrille");

        var tag = list.ChangeScope(vrille, TagScope.PosesAndTransitions, TagCarriers.None, Now).Value!;

        tag.Scope.ShouldBe(TagScope.PosesAndTransitions);
        list.DomainEvents.ShouldHaveSingleItem().ShouldBe(new TagScopeChanged(vrille, TagScope.PosesAndTransitions, Now));
    }

    [Fact]
    public void ChangeScope_Should_RaiseNothing_When_TheScopeIsTheSame()
    {
        var list = Seeded();

        list.ChangeScope(IdOf(list, "vrille"), TagScope.Transitions, TagCarriers.None, Now).IsSuccess.ShouldBeTrue();

        list.DomainEvents.ShouldBeEmpty();
    }

    [Fact]
    public void ChangeScope_Should_FailWithTagNotFound_When_TheTagIsNotInTheList() =>
        Seeded().ChangeScope(NewId(), TagScope.Poses, TagCarriers.None, Now).Error.ShouldBe(CatalogErrors.TagNotFound);

    [Fact]
    public void ChangeScope_Should_Refuse_When_TheTagWouldApplyWhereTheTagItImpliesDoesNot()
    {
        var list = Seeded();

        list.ChangeScope(IdOf(list, "pop"), TagScope.PosesAndTransitions, TagCarriers.None, Now).Error!.Code
            .ShouldBe("catalog.tag-scope-exceeds-implied");
        TagNamed(list, "pop").Scope.ShouldBe(TagScope.Transitions);
    }

    [Fact]
    public void ChangeScope_Should_RefuseListingTheImpliers_When_TheImpliedTagWouldStopApplyingWhereTheyApply()
    {
        var list = Seeded();

        var error = list.ChangeScope(IdOf(list, "dynamique"), TagScope.Poses, TagCarriers.None, Now)
            .Error.ShouldBeOfType<TagScopeNeededByImpliersError>();

        error.Code.ShouldBe("catalog.tag-scope-needed-by-impliers");
        error.ImpliedBy.Select(t => t.Name.Value).ShouldBe(["icarien", "pop", "whip"]);
    }

    private static CarryingTransition Carrying(string from, string to) =>
        new(Guid.NewGuid(), new PoseId(Guid.NewGuid()), PoseName.Create(from).Value!, new PoseId(Guid.NewGuid()), PoseName.Create(to).Value!, null);

    private static CarryingPose CarryingPoseNamed(string name) => new(new PoseId(Guid.NewGuid()), PoseName.Create(name).Value!);

    [Fact]
    public void ChangeScope_Should_RefuseListingTheTransitions_When_TheTagWouldStopApplyingToTransitionsCarryingIt()
    {
        var list = Seeded();
        var birdToLeaf = Carrying("Bird", "Folded Leaf");
        var foldedLeaf = CarryingPoseNamed("Folded Leaf");

        var error = list.ChangeScope(IdOf(list, "lunaire"), TagScope.Poses, new TagCarriers([birdToLeaf], [], [foldedLeaf]), Now)
            .Error.ShouldBeOfType<TagCarriedError>();

        error.Carriers.Transitions.ShouldBe([birdToLeaf]);
        error.Carriers.Poses.ShouldBeEmpty();
    }

    [Fact]
    public void ChangeScope_Should_RefuseListingThePoses_When_TheTagWouldStopApplyingToPosesCarryingIt()
    {
        var list = Seeded();
        var foldedLeaf = CarryingPoseNamed("Folded Leaf");
        var candlestick = CarryingPoseNamed("Candlestick");

        var error = list.ChangeScope(IdOf(list, "lunaire"), TagScope.Transitions, new TagCarriers([Carrying("Bird", "Throne")], [], [foldedLeaf, candlestick]), Now)
            .Error.ShouldBeOfType<TagCarriedError>();

        error.Carriers.Poses.ShouldBe([candlestick, foldedLeaf]);
        error.Carriers.Transitions.ShouldBeEmpty();
    }

    // --- Removing (A6) ------------------------------------------------------------------------

    [Fact]
    public void Remove_Should_RefuseListingThePoses_When_PublishedPosesCarryTheTag()
    {
        var list = Seeded();
        var foldedLeaf = CarryingPoseNamed("Folded Leaf");

        var error = list.Remove(IdOf(list, "lunaire"), Now, new TagCarriers([], [], [foldedLeaf])).Error.ShouldBeOfType<TagCarriedError>();

        error.Carriers.Poses.ShouldBe([foldedLeaf]);
    }

    private static CarryingPendingPose PendingPoseProposal(string name) =>
        new(Guid.NewGuid(), PendingPoseKind.Proposal, PoseName.Create(name).Value!);

    [Fact]
    public void ChangeScope_Should_RefuseListingThePendingPoses_When_TheTagWouldStopApplyingToPendingPosesCarryingIt()
    {
        var list = Seeded();
        var candlestick = PendingPoseProposal("Candlestick");

        var error = list.ChangeScope(IdOf(list, "inversion"), TagScope.Transitions, new TagCarriers([], [], pendingPoses: [candlestick]), Now)
            .Error.ShouldBeOfType<TagCarriedError>();

        error.Carriers.PendingPoses.ShouldBe([candlestick]);
    }

    [Fact]
    public void ChangeScope_Should_IgnoreThePendingPoses_When_TheTagKeepsApplyingToPoses()
    {
        var list = Seeded();

        list.ChangeScope(IdOf(list, "inversion"), TagScope.Poses, new TagCarriers([], [], pendingPoses: [PendingPoseProposal("Candlestick")]), Now)
            .IsSuccess.ShouldBeTrue();
    }

    [Fact]
    public void Remove_Should_RefuseListingThePendingPosesInCatalogOrder_When_PendingPosesCarryTheTag()
    {
        var list = Seeded();
        var straddleBat = PendingPoseProposal("Straddle Bat");
        var candlestick = PendingPoseProposal("Candlestick");

        var error = list.Remove(IdOf(list, "lunaire"), Now, new TagCarriers([], [], pendingPoses: [straddleBat, candlestick]))
            .Error.ShouldBeOfType<TagCarriedError>();

        error.Carriers.PendingPoses.ShouldBe([candlestick, straddleBat]);
    }
}
