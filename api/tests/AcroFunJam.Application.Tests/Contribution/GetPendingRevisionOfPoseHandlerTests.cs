using AcroFunJam.Application.Contribution.GetPendingRevisionOfPose;
using AcroFunJam.Domain.Contribution;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Application.Tests.Contribution;

/// <summary>
/// Whether a published pose already has a pending revision, so that the site tells it as soon as the form opens
/// (story 6, decision D: one pending revision per pose, « la tienne » or not).
/// </summary>
public sealed class GetPendingRevisionOfPoseHandlerTests
{
    private static readonly DateTimeOffset Now = new(2026, 11, 12, 10, 0, 0, TimeSpan.Zero);
    private static readonly ContributorId Alice = new(Guid.NewGuid());
    private static readonly ContributorId Chloe = new(Guid.NewGuid());
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    private static readonly PublishedPose Throne = new(
        new PublishedPoseId(Guid.NewGuid()),
        new PriorPose(
            PoseName.Create("Throne").Value!,
            Difficulty.Create(DifficultyLevel.Beginner, DifficultyLevel.Intermediate).Value!,
            FlowBoundaries.Create(canStartFlow: true, canEndFlow: true).Value!),
        new PublishedPoseVersion(1));

    private static PoseRevisionProposal ARevisionOfThroneBy(ContributorId contributor) =>
        PoseRevisionProposal.Submit(
            new PoseRevisionProposalId(Guid.NewGuid()), new Contributor(contributor, IsValidator: false), Throne, Throne.Version,
            PoseChanges.Create(name: null, baseDifficulty: null, "discovery", canStartFlow: null, canEndFlow: null).Value!, message: null,
            revisionAlreadyPending: false, NameAvailability.Available, Now).Value!;

    private readonly FakePoseRevisionProposalRepository _revisions = new();

    private GetPendingRevisionOfPoseHandler Handler() => new(_revisions);

    [Fact]
    public async Task Handle_Should_ReturnNoPendingRevision_When_ThePoseHasNone()
    {
        var result = await Handler().Handle(new GetPendingRevisionOfPose(Alice, Throne.Id), Ct);

        result.IsSuccess.ShouldBeTrue();
        result.Value.ShouldBeNull();
    }

    [Fact]
    public async Task Handle_Should_SayThePendingRevisionIsTheRequesters_When_TheRequesterProposedIt()
    {
        _revisions.Stored.Add(ARevisionOfThroneBy(Alice));

        var result = await Handler().Handle(new GetPendingRevisionOfPose(Alice, Throne.Id), Ct);

        result.Value.ShouldBe(new PendingRevisionOfPose(IsYours: true));
    }

    [Fact]
    public async Task Handle_Should_SayThePendingRevisionIsSomeoneElses_When_AnotherContributorProposedIt()
    {
        _revisions.Stored.Add(ARevisionOfThroneBy(Chloe));

        var result = await Handler().Handle(new GetPendingRevisionOfPose(Alice, Throne.Id), Ct);

        result.Value.ShouldBe(new PendingRevisionOfPose(IsYours: false));
    }

    [Fact]
    public async Task Handle_Should_ReturnNoPendingRevision_When_TheRevisionOfThePoseIsDecided()
    {
        var revision = ARevisionOfThroneBy(Chloe);
        revision.Reject(new Validator(new ValidatorId(Guid.NewGuid()), CanDecide: true), RejectionReason.Create("Throne reste intermédiaire.").Value!, Now.AddDays(1));
        _revisions.Stored.Add(revision);

        var result = await Handler().Handle(new GetPendingRevisionOfPose(Alice, Throne.Id), Ct);

        result.Value.ShouldBeNull();
    }
}
