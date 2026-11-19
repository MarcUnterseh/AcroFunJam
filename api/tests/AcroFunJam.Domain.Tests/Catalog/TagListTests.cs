using AcroFunJam.Domain.Catalog;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Domain.Tests.Catalog;

/// <summary>The closed list of tags of the catalog (story 8, L1 to L10, ADR 0032).</summary>
public sealed class TagListTests
{
    private static readonly DateTimeOffset Now = new(2026, 11, 16, 10, 0, 0, TimeSpan.Zero);

    private static TagName Name(string name) => TagName.Create(name).Value!;

    private static TagDescription Description(string description) => TagDescription.Create(description).Value!;

    private static TagId NewId() => new(Guid.NewGuid());

    private static (TagList List, TagId Id) ListWith(string name)
    {
        var list = TagList.Empty();
        var id = NewId();
        list.Add(id, Name(name), Description($"Ce que veut dire {name}."), TagScope.Transitions, Now);
        list.ClearDomainEvents();
        return (list, id);
    }

    private static TagId IdOf(TagList list, string name) => list.Tags.Single(t => t.Name.Value == name).Id;

    // --- Seeding (L1) -------------------------------------------------------------------------

    [Fact]
    public void Seed_Should_PresentTheInitialTagsInCatalogOrder_When_TheListIsSeeded()
    {
        var list = TagList.Seed(InitialTagList.Current, NewId, Now);

        list.Tags.Select(t => t.Name.Value).ShouldBe(["dynamique", "icarien", "inversion", "lunaire", "pop", "vrille", "whip"]);
        list.Tags.Single(t => t.Name.Value == "inversion").Description.Value.ShouldBe(
            "La tête du flyer est plus basse que ses hanches, dans la pose ou à un moment de la transition. Ex. : Candlestick, Straddle Bat.");
        list.SeededAt.ShouldBe(Now);
        list.DomainEvents.ShouldHaveSingleItem().ShouldBe(new TagListSeeded(TagListId.Catalog, Now));
    }

    [Fact]
    public void Seed_Should_MakePopWhipAndIcarianImplyDynamic_When_TheListIsSeeded()
    {
        var list = TagList.Seed(InitialTagList.Current, NewId, Now);
        var dynamic = IdOf(list, "dynamique");

        list.Tags.Where(t => t.ImpliedTag == dynamic).Select(t => t.Name.Value).ShouldBe(["icarien", "pop", "whip"]);
        list.Tags.Single(t => t.Name.Value == "dynamique").ImpliedTag.ShouldBeNull();
    }

    [Fact]
    public void Empty_Should_HaveNoTagAndNoSeedingDate_When_Created()
    {
        var list = TagList.Empty();

        list.Id.ShouldBe(TagListId.Catalog);
        list.Tags.ShouldBeEmpty();
        list.SeededAt.ShouldBeNull();
    }

    // --- Adding (L3, L5 to L7) ----------------------------------------------------------------

    [Fact]
    public void Add_Should_AddTheTagAndRaiseTagAdded_When_ItsNameIsFree()
    {
        var list = TagList.Empty();
        var id = NewId();

        var tag = list.Add(id, Name("vrille"), Description("Le flyer tourne sur lui-même."), TagScope.Transitions, Now).Value!;

        tag.ShouldSatisfyAllConditions(
            t => t.Id.ShouldBe(id),
            t => t.Name.ShouldBe(Name("vrille")),
            t => t.Description.ShouldBe(Description("Le flyer tourne sur lui-même.")),
            t => t.ImpliedTag.ShouldBeNull(),
            t => t.RemovedAt.ShouldBeNull());
        list.Tags.ShouldHaveSingleItem().ShouldBe(tag);
        list.DomainEvents.ShouldHaveSingleItem().ShouldBe(new TagAdded(id, Name("vrille"), TagScope.Transitions, Now));
    }

    [Fact]
    public void Tags_Should_BeInCatalogOrder_When_AddedInAnotherOrder()
    {
        var list = TagList.Empty();
        list.Add(NewId(), Name("whip"), Description("D."), TagScope.Transitions, Now);
        list.Add(NewId(), Name("Inversion"), Description("D."), TagScope.Transitions, Now);
        list.Add(NewId(), Name("dynamique"), Description("D."), TagScope.Transitions, Now);

        list.Tags.Select(t => t.Name.Value).ShouldBe(["dynamique", "Inversion", "whip"]);
    }

    [Theory]
    [InlineData("pop", "POP")]
    [InlineData("vrille", "vrillé")]
    [InlineData("inversion", "inversion !")]
    public void Add_Should_FailWithTagNameTaken_When_ATagOfTheListHasTheSameKey(string existing, string added)
    {
        var (list, _) = ListWith(existing);

        list.Add(NewId(), Name(added), Description("D."), TagScope.Transitions, Now).Error.ShouldBe(CatalogErrors.TagNameTaken);
        list.Tags.ShouldHaveSingleItem();
        list.DomainEvents.ShouldBeEmpty();
    }

    // --- Renaming and describing (L8, L9) -----------------------------------------------------

    [Fact]
    public void Rename_Should_RenameTheTagAndRaiseTagRenamed_When_TheNameIsFree()
    {
        var (list, id) = ListWith("lunnaire");

        list.Rename(id, Name("lunaire"), Now).Value!.Name.ShouldBe(Name("lunaire"));
        list.Tags.ShouldHaveSingleItem().Name.ShouldBe(Name("lunaire"));
        list.DomainEvents.ShouldHaveSingleItem().ShouldBe(new TagRenamed(id, Name("lunaire"), Now));
    }

    [Fact]
    public void Rename_Should_BeAllowed_When_OnlyTheCaseOfItsOwnNameChanges()
    {
        var (list, id) = ListWith("Pop");

        list.Rename(id, Name("pop"), Now).Value!.Name.ShouldBe(Name("pop"));
    }

    [Fact]
    public void Rename_Should_FailWithTagNameTaken_When_AnotherTagHasTheSameKey()
    {
        var (list, pop) = ListWith("pop");
        list.Add(NewId(), Name("whip"), Description("D."), TagScope.Transitions, Now);

        list.Rename(pop, Name("Whip"), Now).Error.ShouldBe(CatalogErrors.TagNameTaken);
        list.Tags.Select(t => t.Name.Value).ShouldBe(["pop", "whip"]);
    }

    [Fact]
    public void Rename_Should_FailWithTagNotFound_When_TheTagIsNotInTheList()
    {
        TagList.Empty().Rename(NewId(), Name("pop"), Now).Error.ShouldBe(CatalogErrors.TagNotFound);
    }

    [Fact]
    public void Describe_Should_ChangeTheDescriptionAndRaiseTagDescribed_When_TheTagIsInTheList()
    {
        var (list, id) = ListWith("pop");

        list.Describe(id, Description("La base propulse le flyer."), Now).Value!.Description.ShouldBe(Description("La base propulse le flyer."));
        list.DomainEvents.ShouldHaveSingleItem().ShouldBe(new TagDescribed(id, Now));
    }

    [Fact]
    public void Describe_Should_FailWithTagNotFound_When_TheTagIsNotInTheList()
    {
        TagList.Empty().Describe(NewId(), Description("D."), Now).Error.ShouldBe(CatalogErrors.TagNotFound);
    }

    // --- Removing (L10) -----------------------------------------------------------------------

    [Fact]
    public void Remove_Should_TakeTheTagOutOfTheListAndRaiseTagRemoved_When_NothingCarriesIt()
    {
        var (list, id) = ListWith("vrille");

        list.Remove(id, Now).IsSuccess.ShouldBeTrue();

        list.Tags.ShouldBeEmpty();
        list.DomainEvents.ShouldHaveSingleItem().ShouldBe(new TagRemoved(id, Now));
    }

    [Fact]
    public void Remove_Should_KeepTheRemovedTagKnown_When_ItsHistoryIsNeeded()
    {
        var (list, id) = ListWith("vrille");

        list.Remove(id, Now);

        list.AllTags.ShouldHaveSingleItem().ShouldSatisfyAllConditions(t => t.Id.ShouldBe(id), t => t.RemovedAt.ShouldBe(Now));
    }

    [Fact]
    public void Add_Should_TakeTheNameOfARemovedTag_When_ItIsAddedAgain()
    {
        var (list, removed) = ListWith("vrille");
        list.Remove(removed, Now);

        list.Add(NewId(), Name("vrille"), Description("D."), TagScope.Transitions, Now).IsSuccess.ShouldBeTrue();
    }

    [Fact]
    public void Remove_Should_FailWithTagNotFound_When_TheTagHasAlreadyBeenRemoved()
    {
        var (list, id) = ListWith("vrille");
        list.Remove(id, Now);

        list.Remove(id, Now).Error.ShouldBe(CatalogErrors.TagNotFound);
        list.Rename(id, Name("vrillé"), Now).Error.ShouldBe(CatalogErrors.TagNotFound);
    }

    [Fact]
    public void Remove_Should_FailWithTagImplied_When_ATagOfTheListImpliesIt()
    {
        var list = TagList.Seed(InitialTagList.Current, NewId, Now);
        var dynamic = IdOf(list, "dynamique");

        list.Remove(dynamic, Now).Error.ShouldBe(CatalogErrors.TagImplied);
        list.ImpliersOf(dynamic).Select(t => t.Name.Value).ShouldBe(["icarien", "pop", "whip"]);
    }

    [Fact]
    public void Remove_Should_BeAllowed_When_TheTagsThatImplyItHaveBeenRemoved()
    {
        var list = TagList.Seed(InitialTagList.Current, NewId, Now);
        list.Remove(IdOf(list, "pop"), Now);
        list.Remove(IdOf(list, "whip"), Now);
        list.Remove(IdOf(list, "icarien"), Now);

        list.Remove(IdOf(list, "dynamique"), Now).IsSuccess.ShouldBeTrue();
    }

    // --- Storage ------------------------------------------------------------------------------

    [Fact]
    public void Rehydrate_Should_RestoreTheListWithoutEvents_When_LoadedFromStorage()
    {
        var removed = Tag.Rehydrate(NewId(), Name("vrille"), Description("D."), null, TagScope.Transitions, Now);
        var kept = Tag.Rehydrate(NewId(), Name("pop"), Description("D."), null, TagScope.PosesAndTransitions, null);

        var list = TagList.Rehydrate(Now, 2, [removed, kept]);

        list.Tags.ShouldHaveSingleItem().ShouldBe(kept);
        list.AllTags.Count.ShouldBe(2);
        list.SeededAt.ShouldBe(Now);
        list.DomainEvents.ShouldBeEmpty();
    }

    // --- Choosing (ADR 0033) ------------------------------------------------------------------

    [Fact]
    public void Choose_Should_AddTheTagsTheyImply_When_PopIsChosen()
    {
        var list = TagList.Seed(InitialTagList.Current, NewId, Now);

        var choice = list.Choose([IdOf(list, "pop"), IdOf(list, "inversion")], TagTarget.Transition);

        choice.Tags.ShouldBe(TagSet.Of([IdOf(list, "pop"), IdOf(list, "inversion"), IdOf(list, "dynamique")]));
        choice.NotInList.ShouldBe(TagSet.Empty);
        choice.IsValid.ShouldBeTrue();
    }

    [Fact]
    public void Choose_Should_TellTheTagsNotInTheList_When_UnknownOrRemovedTagsAreChosen()
    {
        var (list, vrille) = ListWith("vrille");
        list.Remove(vrille, Now);
        var unknown = NewId();

        var choice = list.Choose([vrille, unknown], TagTarget.Transition);

        choice.Tags.ShouldBe(TagSet.Empty);
        choice.NotInList.ShouldBe(TagSet.Of([vrille, unknown]));
        choice.IsValid.ShouldBeFalse();
    }

    [Fact]
    public void Choose_Should_GiveTheSameSet_When_AnAlreadyCompletedSetIsChosenAgain()
    {
        var list = TagList.Seed(InitialTagList.Current, NewId, Now);
        var once = list.Choose([IdOf(list, "whip")], TagTarget.Transition);

        list.Choose(once.Tags.Ids, TagTarget.Transition).Tags.ShouldBe(once.Tags);
    }

    [Fact]
    public void NamesOf_Should_NameTheTagsWithTheirCurrentName_When_SomeAreRemoved()
    {
        var (list, lunaire) = ListWith("lunnaire");
        list.Rename(lunaire, Name("lunaire"), Now);
        var vrille = NewId();
        list.Add(vrille, Name("vrille"), Description("D."), TagScope.Transitions, Now);
        list.Remove(vrille, Now);

        list.NamesOf(TagSet.Of([lunaire, vrille, NewId()])).ShouldBe(
            new Dictionary<TagId, TagName> { [lunaire] = Name("lunaire"), [vrille] = Name("vrille") });
    }

    // --- Removing a carried tag (L10, ADR 0033) -----------------------------------------------

    private static CarryingTransition Carrying(string from, string to, string? name = null) =>
        new(Guid.NewGuid(), new PoseId(Guid.NewGuid()), PoseName.Create(from).Value!, new PoseId(Guid.NewGuid()), PoseName.Create(to).Value!,
            TransitionName.CreateOptional(name).Value);

    [Fact]
    public void Remove_Should_FailWithTagCarriedListingItsCarriers_When_TransitionsOrProposalsCarryIt()
    {
        var (list, lunaire) = ListWith("lunaire");
        var birdToLeaf = Carrying("Bird", "Folded Leaf");
        var lunarRoll = Carrying("Folded Leaf", "Throne", "Lunar Roll");
        var pending = Carrying("Bird", "Folded Leaf");

        var error = list.Remove(lunaire, Now, new TagCarriers([lunarRoll, birdToLeaf], [pending])).Error.ShouldBeOfType<TagCarriedError>();

        error.Code.ShouldBe("catalog.tag-carried");
        error.Carriers.Transitions.ShouldBe([birdToLeaf, lunarRoll]);
        error.Carriers.PendingProposals.ShouldBe([pending]);
        list.Tags.ShouldHaveSingleItem();
    }

    [Fact]
    public void Remove_Should_TellTheImplicationFirst_When_TheTagIsBothImpliedAndCarried()
    {
        var list = TagList.Seed(InitialTagList.Current, NewId, Now);

        list.Remove(IdOf(list, "dynamique"), Now, new TagCarriers([Carrying("Throne", "Bird")], [])).Error.ShouldBe(CatalogErrors.TagImplied);
    }

    [Fact]
    public void Remove_Should_RemoveTheTag_When_NothingCarriesIt()
    {
        var (list, vrille) = ListWith("vrille");

        list.Remove(vrille, Now, TagCarriers.None).IsSuccess.ShouldBeTrue();
    }
}
