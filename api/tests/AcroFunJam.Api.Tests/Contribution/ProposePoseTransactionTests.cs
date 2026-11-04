using AcroFunJam.Application.Common;
using AcroFunJam.Application.Contribution;
using AcroFunJam.Application.Contribution.ProposePose;
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
/// The real ProposePose handler, wired by the composition root on a real PostgreSQL: the name reservation and the
/// single transaction of a direct publication (ADR 0016, ADR 0017).
/// </summary>
[Trait("Category", "Integration")]
public sealed class ProposePoseTransactionTests(ApiWithDatabase api) : IClassFixture<ApiWithDatabase>
{
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    private async Task<ContributorId> AnAccount(Role role) => new(await api.AnAccount(role));

    private static ProposedPose APose(string name) => ProposedPose.Create(name, "beginner", "discovery", true, true).Value!;

    private static Task<Result<PoseProposalDto>> Propose(IServiceProvider services, ContributorId contributor, ProposedPose pose) =>
        Task.Run(async () =>
        {
            using var scope = services.CreateScope();
            var handler = scope.ServiceProvider.GetRequiredService<ICommandHandler<ProposePose, PoseProposalDto>>();
            return await handler.Handle(new ProposePose(contributor, pose), Ct);
        }, Ct);

    private async Task<(int Poses, int PendingProposals)> Stored(string name)
    {
        using var scope = api.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AcroFunJamDbContext>();
        return (
            await context.Set<PoseRecord>().CountAsync(p => p.Name == name, Ct),
            await context.Set<PoseProposalRecord>().CountAsync(p => p.Name == name && p.Status == "pending", Ct));
    }

    [Fact]
    public async Task Handle_Should_LetOnlyOneProposalThrough_When_AUserAndAValidatorProposeTheSameNameConcurrently()
    {
        var alice = await AnAccount(Role.User);
        var bruno = await AnAccount(Role.Validator);

        for (var attempt = 0; attempt < 5; attempt++)
        {
            var name = $"Throne {attempt} {Guid.NewGuid():N}"[..24];

            var results = await Task.WhenAll(Propose(api.Services, alice, APose(name)), Propose(api.Services, bruno, APose(name)));

            results.Count(r => r.IsSuccess).ShouldBe(1);
            results.Single(r => r.IsFailure).Error!.Code.ShouldBeOneOf(
                ContributionErrors.PoseNameAlreadyPending.Code, ContributionErrors.PoseNameAlreadyInCatalog.Code);
            var (poses, pending) = await Stored(name);
            (poses + pending).ShouldBe(1); // either the pending proposal or the published pose, never both
        }
    }

    [Fact]
    public async Task Handle_Should_LeaveTheCatalogEmpty_When_TheDirectPublicationFailsAfterPublishing()
    {
        var bruno = await AnAccount(Role.Validator);
        await using var failing = FailingAfterPublication.In(api);
        var name = $"Star {Guid.NewGuid():N}"[..20];

        var result = await Propose(failing.Services, bruno, APose(name));

        result.Error.ShouldBe(FailingAfterPublication.Injected);
        (await Stored(name)).Poses.ShouldBe(0);
    }
}
