using AcroFunJam.Application.Contribution.AcceptPoseRevision;
using AcroFunJam.Application.Contribution.RejectPoseRevision;
using AcroFunJam.Application.Tests.Common;
using AcroFunJam.Application.Tests.Identity;
using AcroFunJam.Domain.Contribution;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Application.Tests.Contribution;

/// <summary>Rejecting a revision proposal: the pose stays as it is (story 6, ADR 0026).</summary>
public sealed class RejectPoseRevisionHandlerTests
{
    private static readonly DateTimeOffset Now = new(2026, 11, 13, 10, 0, 0, TimeSpan.Zero);
    private static readonly Validator Bruno = new(new ValidatorId(Guid.NewGuid()), CanDecide: true);
    private static readonly RejectionReason AnotherPose = RejectionReason.Create("High Bird est une autre pose.").Value!;
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    private static readonly PublishedPose Bird = new(
        new PublishedPoseId(Guid.NewGuid()),
        new PriorPose(
            PoseName.Create("Bird").Value!,
            Difficulty.Create(DifficultyLevel.Discovery, DifficultyLevel.Discovery).Value!,
            FlowBoundaries.Create(canStartFlow: true, canEndFlow: true).Value!),
        new PublishedPoseVersion(1));

    private readonly PoseRevisionProposal _revision = PoseRevisionProposal.Submit(
        new PoseRevisionProposalId(Guid.NewGuid()), new Contributor(new ContributorId(Guid.NewGuid()), IsValidator: false), Bird, Bird.Version,
        PoseChanges.Create(name: "High Bird", baseDifficulty: null, flyerDifficulty: null, canStartFlow: null, canEndFlow: null).Value!, message: null,
        revisionAlreadyPending: false, NameAvailability.Available, Now.AddDays(-1)).Value!;

    private readonly FakePoseRevisionProposalRepository _revisions = new();
    private readonly FakeUnitOfWork _unitOfWork = new();

    public RejectPoseRevisionHandlerTests() => _revisions.Stored.Add(_revision);

    private RejectPoseRevisionHandler Handler(FakeValidators? validators = null) =>
        new(validators ?? new FakeValidators(Bruno), _revisions, _unitOfWork, new FixedTimeProvider(Now));

    [Fact]
    public async Task Handle_Should_RecordTheRejectionAndSave_When_AValidatorRejects()
    {
        var result = await Handler().Handle(new RejectPoseRevision(_revision.Id, Bruno.Id, AnotherPose), Ct);

        result.Value.ShouldBe(new DecidedPoseRevisionDto(_revision.Id, ProposalStatus.Rejected, Retained: null, HasAdjustments: false));
        _revisions.Updated.ShouldHaveSingleItem().Decision.ShouldBe(new Rejection(Bruno.Id, Now, AnotherPose));
        _unitOfWork.Saves.ShouldBe(1);
    }

    [Fact]
    public async Task Handle_Should_FailWithUnknownValidator_When_TheValidatorAccountNoLongerExists()
    {
        var result = await Handler(new FakeValidators()).Handle(new RejectPoseRevision(_revision.Id, Bruno.Id, AnotherPose), Ct);

        result.Error.ShouldBe(ContributionErrors.UnknownValidator);
    }

    [Fact]
    public async Task Handle_Should_FailWithProposalNotFound_When_TheRevisionProposalDoesNotExist()
    {
        var result = await Handler().Handle(new RejectPoseRevision(new PoseRevisionProposalId(Guid.NewGuid()), Bruno.Id, AnotherPose), Ct);

        result.Error.ShouldBe(ContributionErrors.ProposalNotFound);
    }
}
