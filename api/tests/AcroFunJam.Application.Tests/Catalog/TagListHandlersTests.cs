using AcroFunJam.Application.Catalog.AddTag;
using AcroFunJam.Application.Catalog.ChangeTag;
using AcroFunJam.Application.Catalog.ListTags;
using AcroFunJam.Application.Catalog.RemoveTag;
using AcroFunJam.Application.Catalog.SeedInitialTagList;
using AcroFunJam.Application.Tests.Common;
using AcroFunJam.Application.Tests.Identity;
using AcroFunJam.Domain.Catalog;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Application.Tests.Catalog;

/// <summary>Managing and consulting the list of tags (story 8, L1 to L10, ADR 0032).</summary>
public sealed class TagListHandlersTests
{
    private static readonly DateTimeOffset Now = new(2026, 11, 16, 10, 0, 0, TimeSpan.Zero);
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    private readonly FakeTagListRepository _repository = new();
    private readonly FakeUnitOfWork _unitOfWork = new();
    private readonly FixedTimeProvider _clock = new(Now);

    private static TagName Name(string name) => TagName.Create(name).Value!;

    private static TagDescription Description(string description) => TagDescription.Create(description).Value!;

    private TagId Stored(string name)
    {
        _repository.Stored ??= TagList.Empty();
        var id = new TagId(Guid.NewGuid());
        _repository.Stored.Add(id, Name(name), Description($"Ce que veut dire {name}."), Now);
        return id;
    }

    // --- Seeding (L1) -------------------------------------------------------------------------

    [Fact]
    public async Task SeedInitialTagList_Should_SeedAndSaveTheList_When_NoneExists()
    {
        var result = await new SeedInitialTagListHandler(_repository, _unitOfWork, _clock).Handle(new SeedInitialTagList(), Ct);

        result.Value.ShouldBeTrue();
        _repository.Adds.ShouldBe(1);
        _repository.Stored!.Tags.Count.ShouldBe(InitialTagList.Tags.Count);
        _repository.Stored.SeededAt.ShouldBe(Now);
        _unitOfWork.Saves.ShouldBe(1);
    }

    [Fact]
    public async Task SeedInitialTagList_Should_DoNothing_When_TheListAlreadyExists()
    {
        var vrille = Stored("vrille");
        _repository.Stored!.Remove(vrille, Now);

        var result = await new SeedInitialTagListHandler(_repository, _unitOfWork, _clock).Handle(new SeedInitialTagList(), Ct);

        result.Value.ShouldBeFalse();
        _repository.Stored.Tags.ShouldBeEmpty();
        _unitOfWork.Saves.ShouldBe(0);
    }

    // --- Consulting (L2, L3) ------------------------------------------------------------------

    [Fact]
    public async Task ListTags_Should_PresentTheTagsInCatalogOrderWithTheirDescriptions_When_TheListHasSome()
    {
        Stored("whip");
        Stored("Inversion");
        var dynamic = Stored("dynamique");

        var tags = (await new ListTagsHandler(_repository, new FakeTagCarriersReader()).Handle(new ListTags(), Ct)).Value!;

        tags.Select(t => t.Name.Value).ShouldBe(["dynamique", "Inversion", "whip"]);
        tags[0].ShouldSatisfyAllConditions(
            t => t.Id.ShouldBe(dynamic),
            t => t.Description.Value.ShouldBe("Ce que veut dire dynamique."),
            t => t.ImpliedTag.ShouldBeNull(),
            t => t.TransitionCount.ShouldBe(0));
    }

    [Fact]
    public async Task ListTags_Should_PresentNoTag_When_NoListExists()
    {
        (await new ListTagsHandler(_repository, new FakeTagCarriersReader()).Handle(new ListTags(), Ct)).Value!.ShouldBeEmpty();
    }

    // --- Adding (L4 to L7) --------------------------------------------------------------------

    [Fact]
    public async Task AddTag_Should_StartTheListAndSaveIt_When_NoListExists()
    {
        var result = await new AddTagHandler(_repository, _unitOfWork, _clock).Handle(new AddTag(Name("vrille"), Description("Le flyer tourne.")), Ct);

        result.Value!.Name.ShouldBe(Name("vrille"));
        _repository.Adds.ShouldBe(1);
        _repository.Stored!.Tags.ShouldHaveSingleItem().Id.ShouldBe(result.Value.Id);
        _unitOfWork.Saves.ShouldBe(1);
    }

    [Fact]
    public async Task AddTag_Should_UpdateTheList_When_ItExists()
    {
        Stored("pop");

        await new AddTagHandler(_repository, _unitOfWork, _clock).Handle(new AddTag(Name("vrille"), Description("Le flyer tourne.")), Ct);

        _repository.Updates.ShouldBe(1);
        _repository.Stored!.Tags.Select(t => t.Name.Value).ShouldBe(["pop", "vrille"]);
    }

    [Fact]
    public async Task AddTag_Should_FailWithTagNameTakenAndSaveNothing_When_ATagHasTheSameName()
    {
        Stored("pop");

        var result = await new AddTagHandler(_repository, _unitOfWork, _clock).Handle(new AddTag(Name("POP"), Description("D.")), Ct);

        result.Error.ShouldBe(CatalogErrors.TagNameTaken);
        _unitOfWork.Saves.ShouldBe(0);
    }

    [Fact]
    public async Task AddTag_Should_FailWithTheErrorOfTheSave_When_AConcurrentAddTookTheName()
    {
        var unitOfWork = new FakeUnitOfWork(CatalogErrors.TagNameTaken);

        var result = await new AddTagHandler(_repository, unitOfWork, _clock).Handle(new AddTag(Name("pop"), Description("D.")), Ct);

        result.Error.ShouldBe(CatalogErrors.TagNameTaken);
    }

    // --- Changing (L8, L9) --------------------------------------------------------------------

    [Fact]
    public async Task ChangeTag_Should_RenameAndDescribeTheTag_When_BothChange()
    {
        var id = Stored("lunnaire");

        var result = await new ChangeTagHandler(_repository, new FakeTagCarriersReader(), _unitOfWork, _clock).Handle(new ChangeTag(id, Name("lunaire"), Description("Pratique thérapeutique.")), Ct);

        result.Value!.ShouldSatisfyAllConditions(
            t => t.Name.ShouldBe(Name("lunaire")),
            t => t.Description.ShouldBe(Description("Pratique thérapeutique.")));
        _repository.Stored!.DomainEvents.OfType<TagRenamed>().ShouldHaveSingleItem();
        _repository.Stored.DomainEvents.OfType<TagDescribed>().ShouldHaveSingleItem();
        _repository.Updates.ShouldBe(1);
        _unitOfWork.Saves.ShouldBe(1);
    }

    [Fact]
    public async Task ChangeTag_Should_OnlyDescribeTheTag_When_ItsNameIsUnchanged()
    {
        var id = Stored("pop");
        _repository.Stored!.ClearDomainEvents();

        await new ChangeTagHandler(_repository, new FakeTagCarriersReader(), _unitOfWork, _clock).Handle(new ChangeTag(id, Name("pop"), Description("La base propulse le flyer.")), Ct);

        _repository.Stored.DomainEvents.ShouldHaveSingleItem().ShouldBeOfType<TagDescribed>();
    }

    [Fact]
    public async Task ChangeTag_Should_OnlyRenameTheTag_When_ItsDescriptionIsUnchanged()
    {
        var id = Stored("Pop");
        _repository.Stored!.ClearDomainEvents();

        await new ChangeTagHandler(_repository, new FakeTagCarriersReader(), _unitOfWork, _clock).Handle(new ChangeTag(id, Name("pop"), Description("Ce que veut dire Pop.")), Ct);

        _repository.Stored.DomainEvents.ShouldHaveSingleItem().ShouldBeOfType<TagRenamed>();
    }

    [Fact]
    public async Task ChangeTag_Should_FailWithTagNameTakenAndSaveNothing_When_AnotherTagHasTheName()
    {
        var pop = Stored("pop");
        Stored("whip");

        var result = await new ChangeTagHandler(_repository, new FakeTagCarriersReader(), _unitOfWork, _clock).Handle(new ChangeTag(pop, Name("Whip"), Description("D.")), Ct);

        result.Error.ShouldBe(CatalogErrors.TagNameTaken);
        _unitOfWork.Saves.ShouldBe(0);
    }

    [Fact]
    public async Task ChangeTag_Should_FailWithTagNotFound_When_NoListExists()
    {
        var result = await new ChangeTagHandler(_repository, new FakeTagCarriersReader(), _unitOfWork, _clock).Handle(new ChangeTag(new TagId(Guid.NewGuid()), Name("pop"), Description("D.")), Ct);

        result.Error.ShouldBe(CatalogErrors.TagNotFound);
    }

    // --- Removing (L10) -----------------------------------------------------------------------

    [Fact]
    public async Task RemoveTag_Should_RemoveTheTagAndSave_When_NothingCarriesIt()
    {
        var id = Stored("vrille");

        var result = await new RemoveTagHandler(_repository, new FakeTagCarriersReader(), new FakePendingTagCarriers(), new FakePoseRepository(), new FakeTagListLock(), _unitOfWork, _clock).Handle(new RemoveTag(id), Ct);

        result.IsSuccess.ShouldBeTrue();
        _repository.Stored!.Tags.ShouldBeEmpty();
        _unitOfWork.Saves.ShouldBe(1);
    }

    [Fact]
    public async Task RemoveTag_Should_FailWithTagImpliedAndSaveNothing_When_ATagOfTheListImpliesIt()
    {
        _repository.Stored = TagList.Seed(InitialTagList.Tags, () => new TagId(Guid.NewGuid()), Now);
        var dynamic = _repository.Stored.Tags.Single(t => t.Name.Value == "dynamique").Id;

        var result = await new RemoveTagHandler(_repository, new FakeTagCarriersReader(), new FakePendingTagCarriers(), new FakePoseRepository(), new FakeTagListLock(), _unitOfWork, _clock).Handle(new RemoveTag(dynamic), Ct);

        result.Error.ShouldBe(CatalogErrors.TagImplied);
        _unitOfWork.Saves.ShouldBe(0);
    }

    [Fact]
    public async Task RemoveTag_Should_FailWithTagNotFound_When_NoListExists()
    {
        (await new RemoveTagHandler(_repository, new FakeTagCarriersReader(), new FakePendingTagCarriers(), new FakePoseRepository(), new FakeTagListLock(), _unitOfWork, _clock).Handle(new RemoveTag(new TagId(Guid.NewGuid())), Ct))
            .Error.ShouldBe(CatalogErrors.TagNotFound);
    }
}
