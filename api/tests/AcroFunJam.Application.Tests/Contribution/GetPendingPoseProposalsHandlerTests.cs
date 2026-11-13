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
        var handler = new GetPendingPoseProposalsHandler(new FakePendingPoseProposalsReader(), new FakePendingPoseRevisionsReader(), new FakeContributorEmails());

        var result = await handler.Handle(new GetPendingPoseProposals(Bruno), Ct);

        result.Value.ShouldNotBeNull().ShouldBeEmpty();
    }

    [Fact]
    public async Task Handle_Should_PresentThePoseTheContributorEmailAndTheSubmissionDate_When_AProposalIsPending()
    {
        var submittedAt = new DateTimeOffset(2026, 11, 2, 14, 30, 0, TimeSpan.Zero);
        var throne = APendingProposal.Named("Throne").By(Alice).SubmittedAt(submittedAt).Build();
        var handler = new GetPendingPoseProposalsHandler(new FakePendingPoseProposalsReader(throne), new FakePendingPoseRevisionsReader(), new FakeContributorEmails((Alice, "alice@example.org")));

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
        var handler = new GetPendingPoseProposalsHandler(reader, new FakePendingPoseRevisionsReader(), new FakeContributorEmails((Alice, "alice@example.org")));

        var result = await handler.Handle(new GetPendingPoseProposals(Bruno), Ct);

        result.Value.ShouldNotBeNull().OfType<PendingPoseProposalDto>().Select(p => p.ProposedPose.Name.Value).ShouldBe(["Star", "Bird", "Throne"]);
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

        await new GetPendingPoseProposalsHandler(reader, new FakePendingPoseRevisionsReader(), emails).Handle(new GetPendingPoseProposals(Bruno), Ct);

        emails.Calls.ShouldHaveSingleItem().ShouldBe([Alice, chloe], ignoreOrder: true);
    }

    [Fact]
    public async Task Handle_Should_MarkTheProposalAsYours_When_TheRequesterIsItsContributor()
    {
        // A validator can find their own proposal in the queue (submitted before being promoted).
        var reader = new FakePendingPoseProposalsReader(APendingProposal.Named("Throne").By(Alice).Build());
        var handler = new GetPendingPoseProposalsHandler(reader, new FakePendingPoseRevisionsReader(), new FakeContributorEmails((Alice, "alice@example.org")));

        var result = await handler.Handle(new GetPendingPoseProposals(new ValidatorId(Alice.Value)), Ct);

        result.Value.ShouldNotBeNull().ShouldHaveSingleItem().IsYou.ShouldBeTrue();
    }

    [Fact]
    public async Task Handle_Should_PresentNoEmail_When_TheContributorAccountNoLongerExists()
    {
        var reader = new FakePendingPoseProposalsReader(APendingProposal.Named("Throne").By(Alice).Build());
        var handler = new GetPendingPoseProposalsHandler(reader, new FakePendingPoseRevisionsReader(), new FakeContributorEmails());

        var result = await handler.Handle(new GetPendingPoseProposals(Bruno), Ct);

        result.Value.ShouldNotBeNull().ShouldHaveSingleItem().ContributorEmail.ShouldBeNull();
    }

    private static PoseRevisionProposal ARevisionOfThrone(DateTimeOffset submittedAt, string? message = null)
    {
        var throne = new PublishedPose(
            new PublishedPoseId(Guid.NewGuid()),
            new PriorPose(
                AcroFunJam.Domain.SharedKernel.PoseName.Create("Throne").Value!,
                AcroFunJam.Domain.SharedKernel.Difficulty.Create(
                    AcroFunJam.Domain.SharedKernel.DifficultyLevel.Beginner, AcroFunJam.Domain.SharedKernel.DifficultyLevel.Intermediate).Value!,
                AcroFunJam.Domain.SharedKernel.FlowBoundaries.Create(canStartFlow: true, canEndFlow: true).Value!),
            new PublishedPoseVersion(1));
        return PoseRevisionProposal.Submit(
            new PoseRevisionProposalId(Guid.NewGuid()), new Contributor(Alice, IsValidator: false), throne, throne.Version,
            PoseChanges.Create(name: null, baseDifficulty: null, "discovery", canStartFlow: null, canEndFlow: null).Value!,
            RevisionMessage.Create(message).Value, revisionAlreadyPending: false, NameAvailability.Available, submittedAt).Value!;
    }

    /// <summary>Story 6, ADR 0027: the queue presents a revision with the pose before it, the changed fields and the message.</summary>
    [Fact]
    public async Task Handle_Should_PresentThePendingRevisionWithItsChangesMessageContributorAndDate_When_ARevisionIsPending()
    {
        var submittedAt = new DateTimeOffset(2026, 11, 12, 9, 0, 0, TimeSpan.Zero);
        var revision = ARevisionOfThrone(submittedAt, "Throne se découvre dès la première séance.");
        var handler = new GetPendingPoseProposalsHandler(
            new FakePendingPoseProposalsReader(), new FakePendingPoseRevisionsReader(revision), new FakeContributorEmails((Alice, "alice@example.org")));

        var result = await handler.Handle(new GetPendingPoseProposals(Bruno), Ct);

        result.Value.ShouldNotBeNull().ShouldHaveSingleItem().ShouldBeOfType<PendingPoseRevisionDto>().ShouldSatisfyAllConditions(
            r => r.Id.ShouldBe(revision.Id),
            r => r.Pose.ShouldBe(revision.Pose),
            r => r.Current.ShouldBe(revision.Revision.Before),
            r => r.Changes.ShouldBe(revision.Revision.Changes),
            r => r.Message.ShouldBe(revision.Message),
            r => r.ContributorEmail.ShouldBe("alice@example.org"),
            r => r.IsYou.ShouldBeFalse(),
            r => r.SubmittedAt.ShouldBe(submittedAt));
    }

    [Fact]
    public async Task Handle_Should_MergeRevisionsAndPoseProposalsOldestFirst_When_BothArePending()
    {
        var monday = new DateTimeOffset(2026, 11, 9, 9, 0, 0, TimeSpan.Zero);
        var handler = new GetPendingPoseProposalsHandler(
            new FakePendingPoseProposalsReader(APendingProposal.Named("Star").By(Alice).SubmittedAt(monday).Build()),
            new FakePendingPoseRevisionsReader(ARevisionOfThrone(monday.AddDays(2))),
            new FakeContributorEmails((Alice, "alice@example.org")));

        var result = await handler.Handle(new GetPendingPoseProposals(Bruno), Ct);

        result.Value.ShouldNotBeNull().Select(p => p.GetType()).ShouldBe([typeof(PendingPoseProposalDto), typeof(PendingPoseRevisionDto)]);
    }
}
