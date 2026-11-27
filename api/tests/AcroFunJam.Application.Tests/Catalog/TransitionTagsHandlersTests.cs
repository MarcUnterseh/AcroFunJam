using AcroFunJam.Application.Catalog;
using AcroFunJam.Application.Catalog.GetPosePage;
using AcroFunJam.Application.Catalog.GetTagNames;
using AcroFunJam.Application.Catalog.ChooseTags;
using AcroFunJam.Application.Catalog.ListTags;
using AcroFunJam.Application.Catalog.PublishTransition;
using AcroFunJam.Application.Catalog.RemoveTag;
using AcroFunJam.Application.Catalog.TagTransition;
using AcroFunJam.Application.Tests.Common;
using AcroFunJam.Application.Tests.Identity;
using AcroFunJam.Domain.Catalog;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Application.Tests.Catalog;

/// <summary>The tags of the published transitions (story 8, P1 to P5, C1 to C4, ADR 0033).</summary>
public sealed class TransitionTagsHandlersTests
{
    private static readonly DateTimeOffset Now = new(2026, 11, 17, 10, 0, 0, TimeSpan.Zero);
    private static CancellationToken Ct => TestContext.Current.CancellationToken;
    private static readonly Difficulty Beginner = Difficulty.Create(DifficultyLevel.Beginner, DifficultyLevel.Beginner).Value!;

    private static Pose APose(string name) => Pose.Publish(
        new PoseId(Guid.NewGuid()), PoseName.Create(name).Value!, Beginner,
        FlowBoundaries.Create(canStartFlow: true, canEndFlow: true).Value!, source: null, nameAlreadyPublished: false, Now).Value!;

    private readonly Pose _throne = APose("Throne");
    private readonly Pose _bird = APose("Bird");
    private readonly FakePoseRepository _poses = new();
    private readonly FakeTransitionRepository _transitions = new();
    private readonly FakeTagListRepository _lists = new() { Stored = TagList.Seed(InitialTagList.Current, () => new TagId(Guid.NewGuid()), Now) };
    private readonly FakeUnitOfWork _unitOfWork = new();
    private readonly FixedTimeProvider _clock = new(Now);

    public TransitionTagsHandlersTests()
    {
        _poses.Add(_throne);
        _poses.Add(_bird);
    }

    private TagId IdOf(string name) => _lists.Stored!.Tags.Single(t => t.Name.Value == name).Id;

    private Transition Published(params string[] tags)
    {
        var transition = Transition.Publish(
            new TransitionId(Guid.NewGuid()), _throne.Id, _bird.Id, TransitionName.CreateOptional("Pop to Bird").Value, Beginner, description: null,
            _lists.Stored!.Choose(tags.Select(IdOf), TagTarget.Transition), source: null, fromPosePublished: true, toPosePublished: true, slotTaken: false, Now).Value!;
        _transitions.Add(transition);
        return transition;
    }

    // --- Publishing (E4, E6) ------------------------------------------------------------------

    [Fact]
    public async Task PublishTransition_Should_PublishTheTagsChosenThroughTheList_When_PopIsGiven()
    {
        var command = new PublishTransition(_throne.Id, _bird.Id, Name: null, Beginner, Description: null, Source: null, [IdOf("pop")]);

        await new PublishTransitionHandler(_poses, _transitions, _lists, _unitOfWork, _clock).Handle(command, Ct);

        _transitions.Added.ShouldHaveSingleItem().Tags.ShouldBe(TagSet.Of([IdOf("pop"), IdOf("dynamique")]));
    }

    [Fact]
    public async Task PublishTransition_Should_FailWithTagNotInList_When_ATagIsNotInTheList()
    {
        var command = new PublishTransition(
            _throne.Id, _bird.Id, Name: null, Beginner, Description: null, Source: null, [new TagId(Guid.NewGuid())]);

        var result = await new PublishTransitionHandler(_poses, _transitions, _lists, _unitOfWork, _clock).Handle(command, Ct);

        result.Error.ShouldBeOfType<TagNotInListError>();
        _unitOfWork.Saves.ShouldBe(0);
    }

    // --- Tagging directly (P2 to P5) ----------------------------------------------------------

    private TagTransitionHandler Tagging() => new(_transitions, _lists, new FakeTagListLock(), _unitOfWork, _clock);

    [Fact]
    public async Task TagTransition_Should_ReplaceTheTagsCompletedThroughTheList_When_TheTransitionIsPublished()
    {
        var transition = Published("pop");

        var result = await Tagging().Handle(new TagTransition(transition.Id, [IdOf("icarien"), IdOf("vrille")]), Ct);

        result.Value!.ShouldBe(TagSet.Of([IdOf("icarien"), IdOf("vrille"), IdOf("dynamique")]));
        _transitions.Updated.ShouldHaveSingleItem().Tags.ShouldBe(result.Value);
        _unitOfWork.Saves.ShouldBe(1);
    }

    [Fact]
    public async Task TagTransition_Should_FailWithTransitionNotFound_When_TheTransitionIsNotPublished()
    {
        var result = await Tagging().Handle(new TagTransition(new TransitionId(Guid.NewGuid()), [IdOf("pop")]), Ct);

        result.Error.ShouldBe(CatalogErrors.TransitionNotFound);
    }

    [Fact]
    public async Task TagTransition_Should_FailWithTagNotInListAndSaveNothing_When_ATagIsNotInTheList()
    {
        var transition = Published();

        var result = await Tagging().Handle(new TagTransition(transition.Id, [new TagId(Guid.NewGuid())]), Ct);

        result.Error.ShouldBeOfType<TagNotInListError>();
        _unitOfWork.Saves.ShouldBe(0);
    }

    [Fact]
    public async Task TagTransition_Should_TagUnderTheSharedLockOfTheList_When_Tagging()
    {
        var transition = Published();
        var tagLock = new FakeTagListLock();

        await new TagTransitionHandler(_transitions, _lists, tagLock, _unitOfWork, _clock).Handle(new TagTransition(transition.Id, []), Ct);

        tagLock.Taken.ShouldBe(["shared"]);
    }

    // --- Presenting (C1 to C4) ----------------------------------------------------------------

    [Fact]
    public async Task GetPosePage_Should_PresentTheTagsOfTheTransitions_When_TheyCarrySome()
    {
        var reader = new FakePoseTransitionsReader();
        var linked = new LinkedTransition(
            new TransitionId(Guid.NewGuid()), _bird.Id, _bird.Name, Name: null, Beginner, Description: null, TagSet.Of([IdOf("pop"), IdOf("dynamique")]));
        reader.From[_throne.Id] = [linked];

        var page = (await new GetPosePageHandler(_poses, reader, _lists, new FakePendingPoseRevisions(), new FakePosePhotosRepository(), new FakePhotoAddresses(), new FakeTransitionVideosRepository(), new FakeVideoAddresses()).Handle(new GetPosePage(_throne.Id), Ct)).Value!;

        page.TagsOf(page.TransitionsFrom.Single()).Select(t => t.Name.Value).ShouldBe(["dynamique", "pop"]);
        page.TagsOf(page.TransitionsFrom.Single()).Single(t => t.Name.Value == "pop").Description.Value
            .ShouldStartWith("La base propulse le flyer");
    }

    [Fact]
    public async Task ChooseTags_Should_ChooseThroughTheList_When_ContributionAsks()
    {
        var classique = new TagId(Guid.NewGuid());

        var choice = (await new ChooseTagsHandler(_lists).Handle(new ChooseTags([IdOf("whip"), classique]), Ct)).Value!;

        choice.Tags.ShouldBe(TagSet.Of([IdOf("whip"), IdOf("dynamique")]));
        choice.NotInList.ShouldBe(TagSet.Of([classique]));
    }

    [Fact]
    public async Task GetTagNames_Should_NameTheTagsInCatalogOrder_When_TheyAreInTheList()
    {
        var names = (await new GetTagNamesHandler(_lists).Handle(new GetTagNames(TagSet.Of([IdOf("whip"), IdOf("dynamique")])), Ct)).Value!;

        names.Select(t => t.Name.Value).ShouldBe(["dynamique", "whip"]);
        names[0].Id.ShouldBe(IdOf("dynamique"));
    }

    // --- Removing a carried tag (L10) ---------------------------------------------------------

    [Fact]
    public async Task RemoveTag_Should_FailWithTagCarriedListingBothContexts_When_TransitionsAndProposalsCarryIt()
    {
        var lunaire = IdOf("lunaire");
        var published = new CarryingTransition(Guid.NewGuid(), _throne.Id, _throne.Name, _bird.Id, _bird.Name, Name: null);
        var carriers = new FakeTagCarriersReader();
        carriers.Carriers[lunaire] = [published];
        var pending = new FakePendingTagCarriers();
        var proposal = new PendingTagCarrier(Guid.NewGuid(), _bird.Id, _throne.Id, TransitionName.CreateOptional("Lunar Roll").Value);
        pending.Carriers[lunaire] = [proposal];
        var tagLock = new FakeTagListLock();

        var result = await new RemoveTagHandler(_lists, carriers, pending, _poses, tagLock, _unitOfWork, _clock).Handle(new RemoveTag(lunaire), Ct);

        var error = result.Error.ShouldBeOfType<TagCarriedError>();
        error.Carriers.Transitions.ShouldBe([published]);
        error.Carriers.PendingProposals.ShouldBe([new CarryingTransition(proposal.Id, _bird.Id, _bird.Name, _throne.Id, _throne.Name, proposal.Name)]);
        tagLock.Taken.ShouldBe(["exclusive"]);
        _unitOfWork.Saves.ShouldBe(0);
    }

    [Fact]
    public async Task ListTags_Should_TellHowManyPublishedTransitionsCarryEachTag_When_SomeDo()
    {
        var carriers = new FakeTagCarriersReader();
        carriers.Counts[IdOf("lunaire")] = 2;

        var tags = (await new ListTagsHandler(_lists, carriers).Handle(new ListTags(), Ct)).Value!;

        tags.Single(t => t.Name.Value == "lunaire").TransitionCount.ShouldBe(2);
        tags.Single(t => t.Name.Value == "pop").TransitionCount.ShouldBe(0);
    }
}

/// <summary>Records which lock of the list of tags was taken (ADR 0033), and runs the work.</summary>
internal sealed class FakeTagListLock : AcroFunJam.Application.Catalog.ITagListLock
{
    public List<string> Taken { get; } = [];

    public Task<AcroFunJam.Domain.Common.Result<T>> Shared<T>(Func<CancellationToken, Task<AcroFunJam.Domain.Common.Result<T>>> work, CancellationToken ct)
    {
        Taken.Add("shared");
        return work(ct);
    }

    public Task<AcroFunJam.Domain.Common.Result<T>> Exclusive<T>(Func<CancellationToken, Task<AcroFunJam.Domain.Common.Result<T>>> work, CancellationToken ct)
    {
        Taken.Add("exclusive");
        return work(ct);
    }
}
