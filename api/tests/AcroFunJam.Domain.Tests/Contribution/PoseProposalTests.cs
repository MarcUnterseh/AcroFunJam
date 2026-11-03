using AcroFunJam.Domain.Contribution;

namespace AcroFunJam.Domain.Tests.Contribution;

public sealed class PoseProposalTests
{
    private static readonly DateTimeOffset Now = new(2026, 11, 3, 10, 0, 0, TimeSpan.Zero);
    private static readonly Contributor Alice = new(new ContributorId(Guid.NewGuid()), IsValidator: false);

    private static readonly PoseProposalId AnId = new(Guid.NewGuid());

    [Fact]
    public void Submit_Should_BePendingAndRaisePoseProposed_When_TheContributorIsNotAValidator()
    {
        var throne = AProposedPose.Named("Throne");

        var proposal = PoseProposal.Submit(AnId, Alice, throne, NameAvailability.Available, Now);

        proposal.IsSuccess.ShouldBeTrue();
        var pending = proposal.Value!;
        pending.Id.ShouldBe(AnId);
        pending.Contributor.ShouldBe(Alice.Id);
        pending.Pose.ShouldBe(throne);
        pending.Status.ShouldBe(ProposalStatus.Pending);
        pending.IsAccepted.ShouldBeFalse();
        pending.SubmittedAt.ShouldBe(Now);
        pending.AcceptedBy.ShouldBeNull();
        pending.AcceptedAt.ShouldBeNull();
        pending.DomainEvents.ShouldHaveSingleItem().ShouldBe(new PoseProposed(AnId, Alice.Id, throne.Name, Now));
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public void Submit_Should_FailWithoutEvent_When_APublishedPoseHasTheName(bool isValidator)
    {
        var contributor = new Contributor(new ContributorId(Guid.NewGuid()), isValidator);

        var proposal = PoseProposal.Submit(AnId, contributor, AProposedPose.Named("high bird"), NameAvailability.TakenByPublishedPose, Now);

        proposal.Error.ShouldBe(ContributionErrors.PoseNameAlreadyInCatalog);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public void Submit_Should_FailWithoutEvent_When_APendingProposalHasTheName(bool isValidator)
    {
        var contributor = new Contributor(new ContributorId(Guid.NewGuid()), isValidator);

        var proposal = PoseProposal.Submit(AnId, contributor, AProposedPose.Named("throne"), NameAvailability.TakenByPendingProposal, Now);

        proposal.Error.ShouldBe(ContributionErrors.PoseNameAlreadyPending);
    }

    [Theory]
    [InlineData(false, false, NameAvailability.Available)]
    [InlineData(true, false, NameAvailability.TakenByPublishedPose)]
    [InlineData(false, true, NameAvailability.TakenByPendingProposal)]
    [InlineData(true, true, NameAvailability.TakenByPublishedPose)]
    public void From_Should_PreferTheCatalog_When_TheNameIsTakenBothWays(bool published, bool pending, NameAvailability expected)
    {
        NameAvailability.From(published, pending).ShouldBe(expected);
    }

    [Fact]
    public void Submit_Should_BeAcceptedByTheContributorAtOnce_When_TheContributorIsAValidator()
    {
        var bruno = new Contributor(new ContributorId(Guid.NewGuid()), IsValidator: true);
        var throne = AProposedPose.Named("Throne");

        var accepted = PoseProposal.Submit(AnId, bruno, throne, NameAvailability.Available, Now).Value!;

        accepted.Status.ShouldBe(ProposalStatus.Accepted);
        accepted.IsAccepted.ShouldBeTrue();
        accepted.AcceptedBy.ShouldBe(bruno.Id);
        accepted.AcceptedAt.ShouldBe(Now);
        accepted.DomainEvents.ShouldBe(
        [
            new PoseProposed(AnId, bruno.Id, throne.Name, Now),
            new PoseProposalAccepted(AnId, bruno.Id, Now),
        ]);
    }
}
