using AcroFunJam.Domain.Catalog;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Domain.Tests.Catalog;

/// <summary>The tags of a published pose (story 9a, V1, D1 to D4, ADR 0036).</summary>
public sealed class PoseTagsTests
{
    private static readonly DateTimeOffset Now = new(2026, 11, 18, 10, 0, 0, TimeSpan.Zero);
    private static readonly PoseName FoldedLeaf = PoseName.Create("Folded Leaf").Value!;
    private static readonly Difficulty BeginnerOnDiscovery = Difficulty.Create(DifficultyLevel.Beginner, DifficultyLevel.Discovery).Value!;
    private static readonly FlowBoundaries EndsOnly = FlowBoundaries.Create(canStartFlow: false, canEndFlow: true).Value!;
    private static readonly TagId Lunar = new(Guid.NewGuid());
    private static readonly TagId Inversion = new(Guid.NewGuid());

    private static TagChoice Chosen(params TagId[] tags) => new(TagSet.Of(tags), TagSet.Empty);

    private static Pose Published()
    {
        var pose = Pose.Publish(new PoseId(Guid.NewGuid()), FoldedLeaf, BeginnerOnDiscovery, EndsOnly, source: null, nameAlreadyPublished: false, Now).Value!;
        pose.ClearDomainEvents();
        return pose;
    }

    [Fact]
    public void Publish_Should_PublishThePoseWithoutTag_When_NoneIsChosen() => Published().Tags.ShouldBe(TagSet.Empty);

    [Fact]
    public void Publish_Should_CarryTheChosenTags_When_TheyApplyToPoses()
    {
        var pose = Pose.Publish(new PoseId(Guid.NewGuid()), FoldedLeaf, BeginnerOnDiscovery, EndsOnly, source: null, nameAlreadyPublished: false, Now,
            Chosen(Lunar, Inversion)).Value!;

        pose.Tags.ShouldBe(TagSet.Of([Lunar, Inversion]));
        pose.DomainEvents.OfType<PosePublished>().ShouldHaveSingleItem().Tags.ShouldBe(TagSet.Of([Lunar, Inversion]));
    }

    [Fact]
    public void Tag_Should_ReplaceTheTagsIncrementTheVersionAndRaisePoseTagged_When_TheyChange()
    {
        var pose = Published();

        var tagged = pose.Tag(Chosen(Lunar), revisionPending: false, Now);

        tagged.Value.ShouldBe(TagSet.Of([Lunar]));
        pose.Tags.ShouldBe(TagSet.Of([Lunar]));
        pose.Version.Value.ShouldBe(2);
        pose.DomainEvents.ShouldHaveSingleItem().ShouldBe(new PoseTagged(pose.Id, pose.Version, TagSet.Of([Lunar]), Now));
    }

    [Fact]
    public void Tag_Should_RemoveEveryTag_When_NoneIsChosen()
    {
        var pose = Published();
        pose.Tag(Chosen(Lunar), revisionPending: false, Now);

        pose.Tag(Chosen(), revisionPending: false, Now).IsSuccess.ShouldBeTrue();

        pose.Tags.ShouldBe(TagSet.Empty);
        pose.Version.Value.ShouldBe(3);
    }

    [Fact]
    public void Tag_Should_KeepTheVersionWithoutEvent_When_TheSameSetIsChosenInAnotherOrder()
    {
        var pose = Published();
        pose.Tag(Chosen(Lunar, Inversion), revisionPending: false, Now);
        pose.ClearDomainEvents();

        pose.Tag(Chosen(Inversion, Lunar), revisionPending: false, Now).IsSuccess.ShouldBeTrue();

        pose.Version.Value.ShouldBe(2);
        pose.DomainEvents.ShouldBeEmpty();
    }

    [Fact]
    public void Tag_Should_RefuseAndChangeNothing_When_ARevisionOfThePoseIsPending()
    {
        var pose = Published();

        pose.Tag(Chosen(Lunar), revisionPending: true, Now).Error.ShouldBe(CatalogErrors.PoseRevisionPending);

        pose.Tags.ShouldBe(TagSet.Empty);
        pose.Version.Value.ShouldBe(1);
    }

    [Fact]
    public void Tag_Should_TellTheTagsNotInTheListThenThoseNotApplicable_When_SomeAreChosen()
    {
        var pose = Published();
        var classique = new TagId(Guid.NewGuid());
        var pop = new TagId(Guid.NewGuid());

        pose.Tag(new TagChoice(TagSet.Empty, TagSet.Of([classique]), TagSet.Of([pop])), revisionPending: false, Now)
            .Error.ShouldBeOfType<TagNotInListError>().Tags.ShouldBe(TagSet.Of([classique]));
        pose.Tag(new TagChoice(TagSet.Empty, TagSet.Empty, TagSet.Of([pop])), revisionPending: false, Now)
            .Error.ShouldBeOfType<TagNotApplicableError>().Tags.ShouldBe(TagSet.Of([pop]));
    }

    [Fact]
    public void Tag_Should_TellThePendingRevisionFirst_When_TheTagsAreAlsoRefused() =>
        Published().Tag(new TagChoice(TagSet.Empty, TagSet.Of([Lunar])), revisionPending: true, Now).Error.ShouldBe(CatalogErrors.PoseRevisionPending);

    [Fact]
    public void Rehydrate_Should_RestoreTheTags_When_LoadedFromStorage()
    {
        var pose = Pose.Rehydrate(new PoseId(Guid.NewGuid()), FoldedLeaf, BeginnerOnDiscovery, EndsOnly, null, Now, PoseVersion.Initial,
            TagSet.Of([Lunar]));

        pose.Tags.ShouldBe(TagSet.Of([Lunar]));
        pose.DomainEvents.ShouldBeEmpty();
    }

    // --- Revising (story 6, Q172) --------------------------------------------------------------

    private static readonly SourceProposalId ARevision = new(Guid.NewGuid());

    [Fact]
    public void Revise_Should_TakeTheRetainedTags_When_TheRevisionTagsThePose()
    {
        var pose = Published();

        pose.Revise(FoldedLeaf, BeginnerOnDiscovery, EndsOnly, pose.Version, nameTakenByAnotherPose: false, ARevision, Now, Chosen(Lunar))
            .IsSuccess.ShouldBeTrue();

        pose.Tags.ShouldBe(TagSet.Of([Lunar]));
    }

    [Fact]
    public void Revise_Should_KeepTheTags_When_TheRevisionDoesNotTagThePose()
    {
        var pose = Published();
        pose.Tag(Chosen(Inversion), revisionPending: false, Now);

        pose.Revise(FoldedLeaf, BeginnerOnDiscovery, EndsOnly, pose.Version, nameTakenByAnotherPose: false, ARevision, Now);

        pose.Tags.ShouldBe(TagSet.Of([Inversion]));
    }

    [Fact]
    public void Revise_Should_RefuseAndKeepThePose_When_ARetainedTagDoesNotApplyToPoses()
    {
        var pose = Published();
        var version = pose.Version;
        var pop = new TagId(Guid.NewGuid());

        pose.Revise(FoldedLeaf, BeginnerOnDiscovery, EndsOnly, version, nameTakenByAnotherPose: false, ARevision, Now,
                new TagChoice(TagSet.Of([Lunar]), TagSet.Empty, TagSet.Of([pop])))
            .Error.ShouldBeOfType<TagNotApplicableError>();
        pose.ShouldSatisfyAllConditions(p => p.Tags.ShouldBe(TagSet.Empty), p => p.Version.ShouldBe(version));
    }
}
