using AcroFunJam.Application.Catalog.PublishPose;
using AcroFunJam.Application.Common;
using AcroFunJam.Application.Contribution.AcceptTransitionProposal;
using AcroFunJam.Application.Contribution.ProposeTransition;
using AcroFunJam.Application.Contribution.RejectTransitionProposal;
using AcroFunJam.Domain.Catalog;
using AcroFunJam.Domain.Common;
using AcroFunJam.Domain.Contribution;
using AcroFunJam.Domain.Identity;
using AcroFunJam.Domain.SharedKernel;
using AcroFunJam.Infrastructure.Persistence;
using AcroFunJam.Infrastructure.Persistence.Catalog;
using AcroFunJam.Infrastructure.Persistence.Contribution;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace AcroFunJam.Api.Tests.Contribution;

/// <summary>
/// The real ProposeTransition, AcceptTransitionProposal and RejectTransitionProposal handlers, wired by the composition root on a
/// real PostgreSQL (story 7): one place per couple of poses under concurrency (ADR 0029), a publication in the same transaction
/// as the proposal or the acceptance (ADR 0016, ADR 0028), a single decision per proposal (ADR 0022).
/// </summary>
[Trait("Category", "Integration")]
public sealed class TransitionTransactionTests(ApiWithDatabase api) : IClassFixture<ApiWithDatabase>
{
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    private static readonly ProposedTransition Unnamed = ProposedTransition.Create(name: null, "beginner", "beginner", description: null).Value!;

    /// <summary>Two freshly published poses, under unique names, so that each attempt has its own couple.</summary>
    private async Task<TransitionPoses> ACouple()
    {
        using var scope = api.Services.CreateScope();
        var publish = scope.ServiceProvider.GetRequiredService<ICommandHandler<PublishPose, PoseId>>();
        async Task<Guid> Published()
        {
            var pose = ProposedPose.Create($"Pose {Guid.NewGuid():N}"[..24], "beginner", "beginner", true, true).Value!;
            return (await publish.Handle(new PublishPose(pose.Name, pose.Difficulty, pose.Flow, Source: null), Ct)).Value!.Value;
        }

        return TransitionPoses.Create(await Published(), await Published()).Value!;
    }

    private static Task<Result<TransitionProposalDto>> Propose(IServiceProvider services, Guid contributor, TransitionPoses poses) =>
        Task.Run(async () =>
        {
            using var scope = services.CreateScope();
            var handler = scope.ServiceProvider.GetRequiredService<ICommandHandler<ProposeTransition, TransitionProposalDto>>();
            return await handler.Handle(new ProposeTransition(new ContributorId(contributor), poses, Unnamed), Ct);
        }, Ct);

    private static Task<Result<DecidedTransitionProposalDto>> Accept(IServiceProvider services, TransitionProposalId proposal, Guid validator) =>
        Task.Run(async () =>
        {
            using var scope = services.CreateScope();
            var handler = scope.ServiceProvider.GetRequiredService<ICommandHandler<AcceptTransitionProposal, DecidedTransitionProposalDto>>();
            return await handler.Handle(new AcceptTransitionProposal(proposal, new ValidatorId(validator), TransitionAdjustments.None, Note: null), Ct);
        }, Ct);

    private static Task<Result<DecidedTransitionProposalDto>> Reject(IServiceProvider services, TransitionProposalId proposal, Guid validator) =>
        Task.Run(async () =>
        {
            using var scope = services.CreateScope();
            var handler = scope.ServiceProvider.GetRequiredService<ICommandHandler<RejectTransitionProposal, DecidedTransitionProposalDto>>();
            var reason = RejectionReason.Create("Cette transition arrive en Bird, pas en Star : propose-la vers Bird.").Value!;
            return await handler.Handle(new RejectTransitionProposal(proposal, new ValidatorId(validator), reason), Ct);
        }, Ct);

    /// <summary>How many transitions are published between the poses, and the statuses of the proposals between them.</summary>
    private async Task<(int Published, string Statuses)> Stored(TransitionPoses poses)
    {
        using var scope = api.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AcroFunJamDbContext>();
        var published = await context.Set<TransitionRecord>().CountAsync(t => t.FromPoseId == poses.From.Value && t.ToPoseId == poses.To.Value, Ct);
        var statuses = await context.Set<TransitionProposalRecord>()
            .Where(p => p.FromPoseId == poses.From.Value && p.ToPoseId == poses.To.Value).Select(p => p.Status).ToListAsync(Ct);
        return (published, string.Join(",", statuses));
    }

    /// <summary>R9 under concurrency: the reservation of the couple and the partial unique indexes let a single one through.</summary>
    [Fact]
    public async Task Propose_Should_LetOnlyOneUnnamedTransitionThrough_When_TwoAreProposedConcurrentlyBetweenTheSamePoses()
    {
        var alice = await api.AnAccount(Role.User);
        var chloe = await api.AnAccount(Role.User);

        for (var attempt = 0; attempt < 5; attempt++)
        {
            var poses = await ACouple();

            var results = await Task.WhenAll(Propose(api.Services, alice, poses), Propose(api.Services, chloe, poses));

            results.Count(r => r.IsSuccess).ShouldBe(1);
            results.Single(r => r.IsFailure).Error.ShouldBe(ContributionErrors.UnnamedTransitionAlreadyPending);
            (await Stored(poses)).ShouldBe((0, "pending"));
        }
    }

    /// <summary>R2: a direct publication that fails after publishing leaves neither the transition nor the proposal.</summary>
    [Fact]
    public async Task Propose_Should_SaveNothing_When_AStepFailsAfterADirectPublication()
    {
        var bruno = await api.AnAccount(Role.Validator);
        var poses = await ACouple();
        await using var failing = FailingAfterPublication.In(api);

        var result = await Propose(failing.Services, bruno, poses);

        result.Error.ShouldBe(FailingAfterPublication.Injected);
        (await Stored(poses)).ShouldBe((0, ""));
    }

    /// <summary>R15: an acceptance that fails after publishing leaves the proposal pending and publishes nothing.</summary>
    [Fact]
    public async Task Accept_Should_LeaveTheProposalPending_When_AStepFailsAfterTheTransitionWasPublished()
    {
        var alice = await api.AnAccount(Role.User);
        var bruno = await api.AnAccount(Role.Validator);
        var poses = await ACouple();
        var proposal = (await Propose(api.Services, alice, poses)).Value!.Id;
        await using var failing = FailingAfterPublication.In(api);

        var result = await Accept(failing.Services, proposal, bruno);

        result.Error.ShouldBe(FailingAfterPublication.Injected);
        (await Stored(poses)).ShouldBe((0, "pending"));
    }

    /// <summary>R20: a single decision per proposal, published if and only if accepted.</summary>
    [Fact]
    public async Task Decide_Should_LetOnlyOneDecisionThrough_When_AnAcceptanceAndARejectionRace()
    {
        var alice = await api.AnAccount(Role.User);
        var bruno = await api.AnAccount(Role.Validator);
        var paul = await api.AnAccount(Role.Administrator);

        for (var attempt = 0; attempt < 5; attempt++)
        {
            var poses = await ACouple();
            var proposal = (await Propose(api.Services, alice, poses)).Value!.Id;

            var (accepted, rejected) = (Accept(api.Services, proposal, bruno), Reject(api.Services, proposal, paul));
            await Task.WhenAll(accepted, rejected);

            new[] { accepted.Result.IsSuccess, rejected.Result.IsSuccess }.Count(s => s).ShouldBe(1);
            (accepted.Result.IsFailure ? accepted.Result.Error : rejected.Result.Error).ShouldBe(ContributionErrors.ProposalAlreadyDecided);
            (await Stored(poses)).ShouldBe(accepted.Result.IsSuccess ? (1, "accepted") : (0, "rejected"));
        }
    }
}
