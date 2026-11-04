using AcroFunJam.Application.Contribution.GetPendingPoseProposals;
using AcroFunJam.Domain.Contribution;

namespace AcroFunJam.Application.Tests.Contribution;

public sealed class GetPendingPoseProposalsHandlerTests
{
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    private static readonly ValidatorId Bruno = new(Guid.NewGuid());
    private static readonly ContributorId Alice = new(Guid.NewGuid());

    [Fact]
    public async Task Handle_Should_ReturnAnEmptyQueue_When_NoProposalIsPending()
    {
        var handler = new GetPendingPoseProposalsHandler(new FakePendingPoseProposalsReader(), new FakeContributorEmails());

        var result = await handler.Handle(new GetPendingPoseProposals(Bruno), Ct);

        result.Value.ShouldNotBeNull().ShouldBeEmpty();
    }

    [Fact]
    public async Task Handle_Should_PresentThePoseTheContributorEmailAndTheSubmissionDate_When_AProposalIsPending()
    {
        var submittedAt = new DateTimeOffset(2026, 11, 2, 14, 30, 0, TimeSpan.Zero);
        var throne = APendingProposal.Named("Throne").By(Alice).SubmittedAt(submittedAt).Build();
        var handler = new GetPendingPoseProposalsHandler(
            new FakePendingPoseProposalsReader(throne), new FakeContributorEmails((Alice, "alice@example.org")));

        var result = await handler.Handle(new GetPendingPoseProposals(Bruno), Ct);

        result.Value.ShouldNotBeNull().ShouldHaveSingleItem()
            .ShouldBe(new PendingPoseProposalDto(throne.Id, throne.Pose, "alice@example.org", IsYou: false, submittedAt));
    }

    [Fact]
    public async Task Handle_Should_OrderTheQueueOldestFirst_When_ProposalsWereSubmittedAtDifferentTimes()
    {
        var monday = new DateTimeOffset(2026, 11, 2, 9, 0, 0, TimeSpan.Zero);
        var reader = new FakePendingPoseProposalsReader(
            APendingProposal.Named("Throne").By(Alice).SubmittedAt(monday.AddDays(2)).Build(),
            APendingProposal.Named("Star").By(Alice).SubmittedAt(monday).Build(),
            APendingProposal.Named("Bird").By(Alice).SubmittedAt(monday.AddDays(1)).Build());
        var handler = new GetPendingPoseProposalsHandler(reader, new FakeContributorEmails((Alice, "alice@example.org")));

        var result = await handler.Handle(new GetPendingPoseProposals(Bruno), Ct);

        result.Value.ShouldNotBeNull().Select(p => p.ProposedPose.Name.Value).ShouldBe(["Star", "Bird", "Throne"]);
    }

    [Fact]
    public async Task Handle_Should_AskTheEmailsOfAllContributorsInOneCall_When_SeveralProposalsArePending()
    {
        var chloe = new ContributorId(Guid.NewGuid());
        var emails = new FakeContributorEmails((Alice, "alice@example.org"), (chloe, "chloe@example.org"));
        var reader = new FakePendingPoseProposalsReader(
            APendingProposal.Named("Throne").By(Alice).Build(),
            APendingProposal.Named("Star").By(chloe).Build(),
            APendingProposal.Named("Bird").By(Alice).Build());

        await new GetPendingPoseProposalsHandler(reader, emails).Handle(new GetPendingPoseProposals(Bruno), Ct);

        emails.Calls.ShouldHaveSingleItem().ShouldBe([Alice, chloe], ignoreOrder: true);
    }

    [Fact]
    public async Task Handle_Should_MarkTheProposalAsYours_When_TheRequesterIsItsContributor()
    {
        // A validator can find their own proposal in the queue (submitted before being promoted).
        var reader = new FakePendingPoseProposalsReader(APendingProposal.Named("Throne").By(Alice).Build());
        var handler = new GetPendingPoseProposalsHandler(reader, new FakeContributorEmails((Alice, "alice@example.org")));

        var result = await handler.Handle(new GetPendingPoseProposals(new ValidatorId(Alice.Value)), Ct);

        result.Value.ShouldNotBeNull().ShouldHaveSingleItem().IsYou.ShouldBeTrue();
    }

    [Fact]
    public async Task Handle_Should_PresentNoEmail_When_TheContributorAccountNoLongerExists()
    {
        var reader = new FakePendingPoseProposalsReader(APendingProposal.Named("Throne").By(Alice).Build());
        var handler = new GetPendingPoseProposalsHandler(reader, new FakeContributorEmails());

        var result = await handler.Handle(new GetPendingPoseProposals(Bruno), Ct);

        result.Value.ShouldNotBeNull().ShouldHaveSingleItem().ContributorEmail.ShouldBeNull();
    }
}
