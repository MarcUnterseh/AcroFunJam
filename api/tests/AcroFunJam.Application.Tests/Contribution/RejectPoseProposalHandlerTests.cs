using AcroFunJam.Application.Contribution;
using AcroFunJam.Application.Contribution.RejectPoseProposal;
using AcroFunJam.Application.Tests.Common;
using AcroFunJam.Application.Tests.Identity;
using AcroFunJam.Domain.Contribution;

namespace AcroFunJam.Application.Tests.Contribution;

public sealed class RejectPoseProposalHandlerTests
{
    private static readonly DateTimeOffset Now = new(2026, 11, 4, 10, 0, 0, TimeSpan.Zero);
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    private static readonly Validator Bruno = new(new ValidatorId(Guid.NewGuid()), CanDecide: true);
    private static readonly RejectionReason Duplicate = RejectionReason.Create("Doublon de Throne.").Value!;

    private readonly PoseProposal _throne = APendingProposal.Named("Throne").Build();
    private readonly FakeValidators _validators = new(Bruno);
    private readonly FakePoseProposalRepository _proposals;
    private readonly FakeUnitOfWork _unitOfWork = new();

    public RejectPoseProposalHandlerTests() => _proposals = new FakePoseProposalRepository { Stored = [_throne] };

    private RejectPoseProposalHandler Handler() => new(_validators, _proposals, _unitOfWork, new FixedTimeProvider(Now));

    [Fact]
    public async Task Handle_Should_FailWithUnknownValidator_When_TheValidatorAccountNoLongerExists()
    {
        var deleted = new ValidatorId(Guid.NewGuid());

        var result = await Handler().Handle(new RejectPoseProposal(_throne.Id, deleted, Duplicate), Ct);

        result.Error.ShouldBe(ContributionErrors.UnknownValidator);
    }

    [Fact]
    public async Task Handle_Should_FailWithProposalNotFound_When_TheProposalDoesNotExist()
    {
        var result = await Handler().Handle(new RejectPoseProposal(new PoseProposalId(Guid.NewGuid()), Bruno.Id, Duplicate), Ct);

        result.Error.ShouldBe(ContributionErrors.ProposalNotFound);
    }

    [Fact]
    public async Task Handle_Should_SaveTheRejection_When_AValidatorRejects()
    {
        var result = await Handler().Handle(new RejectPoseProposal(_throne.Id, Bruno.Id, Duplicate), Ct);

        result.Value.ShouldBe(new DecidedPoseProposalDto(_throne.Id, ProposalStatus.Rejected, Retained: null, Adjusted: false));
        _proposals.Updated.ShouldHaveSingleItem().Decision.ShouldBe(new Rejection(Bruno.Id, Now, Duplicate));
        _unitOfWork.Saves.ShouldBe(1);
    }

    [Fact]
    public async Task Handle_Should_ReturnProposalAlreadyDecided_When_SavingDetectsAConcurrentDecision()
    {
        var handler = new RejectPoseProposalHandler(
            _validators, _proposals, new FakeUnitOfWork(ContributionErrors.ProposalAlreadyDecided), new FixedTimeProvider(Now));

        var result = await handler.Handle(new RejectPoseProposal(_throne.Id, Bruno.Id, Duplicate), Ct);

        result.Error.ShouldBe(ContributionErrors.ProposalAlreadyDecided);
    }

    [Fact]
    public async Task Handle_Should_FailWithoutSaving_When_TheProposalIsAlreadyDecided()
    {
        var star = APendingProposal.Named("Star").Build();
        star.Accept(Bruno, star.Pose.Retain(PoseAdjustments.None), null, NameAvailability.Available, Now.AddHours(-1));
        var handler = new RejectPoseProposalHandler(
            _validators, new FakePoseProposalRepository { Stored = [star] }, _unitOfWork, new FixedTimeProvider(Now));

        var result = await handler.Handle(new RejectPoseProposal(star.Id, Bruno.Id, Duplicate), Ct);

        result.Error.ShouldBe(ContributionErrors.ProposalAlreadyDecided);
        _unitOfWork.Saves.ShouldBe(0);
    }
}
