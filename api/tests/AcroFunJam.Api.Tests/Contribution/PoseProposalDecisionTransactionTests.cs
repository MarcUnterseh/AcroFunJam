using AcroFunJam.Application.Catalog.PublishPose;
using AcroFunJam.Application.Common;
using AcroFunJam.Application.Contribution;
using AcroFunJam.Application.Contribution.AcceptPoseProposal;
using AcroFunJam.Application.Contribution.ProposePose;
using AcroFunJam.Application.Contribution.RejectPoseProposal;
using AcroFunJam.Domain.Catalog;
using AcroFunJam.Domain.Common;
using AcroFunJam.Domain.Contribution;
using AcroFunJam.Domain.Identity;
using AcroFunJam.Infrastructure.Persistence;
using AcroFunJam.Infrastructure.Persistence.Catalog;
using AcroFunJam.Infrastructure.Persistence.Contribution;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace AcroFunJam.Api.Tests.Contribution;

/// <summary>
/// The real AcceptPoseProposal and RejectPoseProposal handlers, wired by the composition root on a real PostgreSQL:
/// a single decision per proposal, and a publication in the same transaction as the acceptance (ADR 0022).
/// </summary>
[Trait("Category", "Integration")]
public sealed class PoseProposalDecisionTransactionTests(ApiWithDatabase api) : IClassFixture<ApiWithDatabase>
{
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    private Task<Guid> AnAccount(Role role) => api.AnAccount(role);

    /// <summary>A pending proposal of a user, under a unique name.</summary>
    private async Task<(PoseProposalId Id, string Name)> APendingProposal(Guid contributor)
    {
        var name = $"Throne {Guid.NewGuid():N}"[..24];
        using var scope = api.Services.CreateScope();
        var propose = scope.ServiceProvider.GetRequiredService<ICommandHandler<ProposePose, PoseProposalDto>>();
        var proposed = await propose.Handle(
            new ProposePose(new ContributorId(contributor), ProposedPose.Create(name, "beginner", "discovery", true, true).Value!), Ct);
        proposed.Value.ShouldNotBeNull().Status.ShouldBe(ProposalStatus.Pending);
        return (proposed.Value.Id, name);
    }

    private static Task<Result<DecidedPoseProposalDto>> Accept(IServiceProvider services, PoseProposalId proposal, Guid validator) =>
        Task.Run(async () =>
        {
            using var scope = services.CreateScope();
            var handler = scope.ServiceProvider.GetRequiredService<ICommandHandler<AcceptPoseProposal, DecidedPoseProposalDto>>();
            return await handler.Handle(new AcceptPoseProposal(proposal, new ValidatorId(validator)), Ct);
        }, Ct);

    private static Task<Result<DecidedPoseProposalDto>> Reject(IServiceProvider services, PoseProposalId proposal, Guid validator) =>
        Task.Run(async () =>
        {
            using var scope = services.CreateScope();
            var handler = scope.ServiceProvider.GetRequiredService<ICommandHandler<RejectPoseProposal, DecidedPoseProposalDto>>();
            var reason = RejectionReason.Create("Doublon de Bird, déjà au catalogue.").Value!;
            return await handler.Handle(new RejectPoseProposal(proposal, new ValidatorId(validator), reason), Ct);
        }, Ct);

    private async Task<(int Poses, string Status)> Stored(PoseProposalId proposal, string name)
    {
        using var scope = api.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AcroFunJamDbContext>();
        return (
            await context.Set<PoseRecord>().CountAsync(p => p.Name == name, Ct),
            (await context.Set<PoseProposalRecord>().SingleAsync(p => p.Id == proposal.Value, Ct)).Status);
    }

    [Fact]
    public async Task Handle_Should_PublishOnlyOnce_When_TwoValidatorsAcceptTheSameProposalConcurrently()
    {
        var alice = await AnAccount(Role.User);
        var bruno = await AnAccount(Role.Validator);
        var paul = await AnAccount(Role.Administrator);

        for (var attempt = 0; attempt < 5; attempt++)
        {
            var (proposal, name) = await APendingProposal(alice);

            var results = await Task.WhenAll(Accept(api.Services, proposal, bruno), Accept(api.Services, proposal, paul));

            results.Count(r => r.IsSuccess).ShouldBe(1);
            results.Single(r => r.IsFailure).Error.ShouldBe(ContributionErrors.ProposalAlreadyDecided);
            (await Stored(proposal, name)).ShouldBe((1, "accepted"));
        }
    }

    [Fact]
    public async Task Handle_Should_LetOnlyOneDecisionThrough_When_AnAcceptanceAndARejectionRace()
    {
        var alice = await AnAccount(Role.User);
        var bruno = await AnAccount(Role.Validator);
        var paul = await AnAccount(Role.Administrator);

        for (var attempt = 0; attempt < 5; attempt++)
        {
            var (proposal, name) = await APendingProposal(alice);

            var (accepted, rejected) = (Accept(api.Services, proposal, bruno), Reject(api.Services, proposal, paul));
            await Task.WhenAll(accepted, rejected);

            new[] { accepted.Result, rejected.Result }.Count(r => r.IsSuccess).ShouldBe(1);
            new[] { accepted.Result, rejected.Result }.Single(r => r.IsFailure).Error.ShouldBe(ContributionErrors.ProposalAlreadyDecided);
            // The stored decision is the one that went through: published if and only if accepted.
            (await Stored(proposal, name)).ShouldBe(accepted.Result.IsSuccess ? (1, "accepted") : (0, "rejected"));
        }
    }

    /// <summary>A pose entering the catalog without this proposal (data seeding, future modification of a published pose).</summary>
    private async Task PublishedElsewhere(string name)
    {
        using var scope = api.Services.CreateScope();
        var publish = scope.ServiceProvider.GetRequiredService<ICommandHandler<PublishPose, PoseId>>();
        var pose = ProposedPose.Create(name, "intermediate", "beginner", true, true).Value!;
        (await publish.Handle(new PublishPose(pose.Name, pose.Difficulty, pose.Flow, Source: null), Ct)).IsSuccess.ShouldBeTrue();
    }

    [Fact]
    public async Task Handle_Should_LeaveTheProposalPending_When_APoseOfTheSameNameWasPublishedInBetween()
    {
        var alice = await AnAccount(Role.User);
        var bruno = await AnAccount(Role.Validator);
        var (proposal, name) = await APendingProposal(alice);
        await PublishedElsewhere(name);

        var result = await Accept(api.Services, proposal, bruno);

        result.Error.ShouldBe(ContributionErrors.PoseNameAlreadyInCatalog);
        (await Stored(proposal, name)).ShouldBe((1, "pending"));
    }

    [Fact]
    public async Task Handle_Should_LeaveTheProposalPending_When_AStepFailsAfterThePoseWasPublished()
    {
        var alice = await AnAccount(Role.User);
        var bruno = await AnAccount(Role.Validator);
        var (proposal, name) = await APendingProposal(alice);
        await using var failing = FailingAfterPublication.In(api);

        var result = await Accept(failing.Services, proposal, bruno);

        result.Error.ShouldBe(FailingAfterPublication.Injected);
        (await Stored(proposal, name)).ShouldBe((0, "pending"));
    }
}
