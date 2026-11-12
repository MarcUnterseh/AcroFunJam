using AcroFunJam.Application.Contribution.GetMyPoseProposals;
using AcroFunJam.Domain.Contribution;

namespace AcroFunJam.Application.Tests.Contribution;

public sealed class GetMyPoseProposalsHandlerTests
{
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    private static readonly ContributorId Alice = new(Guid.NewGuid());
    private static readonly ContributorId Chloe = new(Guid.NewGuid());

    [Fact]
    public async Task Handle_Should_ReturnAnEmptyList_When_TheContributorHasProposedNothing()
    {
        var handler = new GetMyPoseProposalsHandler(new FakeMyPoseProposalsReader());

        var result = await handler.Handle(new GetMyPoseProposals(Alice), Ct);

        result.Value.ShouldNotBeNull().ShouldBeEmpty();
    }

    [Fact]
    public async Task Handle_Should_ReadTheRequesterProposalsOnly_When_Queried()
    {
        var throne = APendingProposal.Named("Throne").By(Alice).Build();
        var star = APendingProposal.Named("Star").By(Chloe).Build();
        var reader = new FakeMyPoseProposalsReader(throne, star);
        var handler = new GetMyPoseProposalsHandler(reader);

        var result = await handler.Handle(new GetMyPoseProposals(Alice), Ct);

        reader.Calls.ShouldBe([Alice]);
        result.Value.ShouldNotBeNull().Select(p => p.Id).ShouldBe([throne.Id]);
    }

    [Fact]
    public async Task Handle_Should_PresentEachProposalForItsContributor_When_TheReaderReturnsProposals()
    {
        var throne = APendingProposal.Named("Throne").By(Alice).Build();
        var bruno = new Validator(new ValidatorId(Guid.NewGuid()), CanDecide: true);
        throne.Reject(bruno, RejectionReason.Create("Doublon de Bird, déjà au catalogue.").Value!, throne.SubmittedAt.AddDays(1));
        var handler = new GetMyPoseProposalsHandler(new FakeMyPoseProposalsReader(throne));

        var result = await handler.Handle(new GetMyPoseProposals(Alice), Ct);

        var presented = result.Value.ShouldNotBeNull().ShouldHaveSingleItem();
        presented.ShouldSatisfyAllConditions(
            () => presented.Status.ShouldBe(MyProposalStatus.Rejected),
            () => presented.Reason.ShouldNotBeNull().Value.ShouldBe("Doublon de Bird, déjà au catalogue."));
    }

    [Fact]
    public async Task Handle_Should_ReturnTheMostRecentlySubmittedFirst_When_TheReaderReturnsThemInAnyOrder()
    {
        var monday = new DateTimeOffset(2026, 11, 2, 9, 0, 0, TimeSpan.Zero);
        var reader = new FakeMyPoseProposalsReader(
            APendingProposal.Named("Star").By(Alice).SubmittedAt(monday).Build(),
            APendingProposal.Named("Throne").By(Alice).SubmittedAt(monday.AddDays(2)).Build(),
            APendingProposal.Named("Bird").By(Alice).SubmittedAt(monday.AddDays(1)).Build());
        var handler = new GetMyPoseProposalsHandler(reader);

        var result = await handler.Handle(new GetMyPoseProposals(Alice), Ct);

        result.Value.ShouldNotBeNull().Select(p => p.Name.Value).ShouldBe(["Throne", "Bird", "Star"]);
    }
}
