using System.Net.Http.Json;
using AcroFunJam.Application.Catalog.PublishPose;
using AcroFunJam.Application.Catalog.PublishTransition;
using AcroFunJam.Application.Common;
using AcroFunJam.Domain.Catalog;
using AcroFunJam.Domain.SharedKernel;
using AcroFunJam.Specs.Support.Identity;
using Microsoft.Extensions.DependencyInjection;
using Reqnroll;

namespace AcroFunJam.Specs.Support.Catalog;

/// <summary>
/// Publishes a pose for a "Soit" step (ADR 0020): through the PublishPose command in an @Integration feature
/// (real database, no HTTP), otherwise in the scenario data exposed behind the read port (ADR 0006).
/// </summary>
public sealed class CatalogPublishing(CatalogTestData seeded, Deployment deployment, ScenarioContext scenario)
{
    public async Task Publish(string name, string baseDifficulty, string flyerDifficulty, bool canStartFlow = true, bool canEndFlow = true)
    {
        if (!IntegrationDatabase.IsUsedBy(scenario.ScenarioInfo))
        {
            seeded.Publish(new SeededPose(name, baseDifficulty, flyerDifficulty, canStartFlow, canEndFlow));
            return;
        }

        using var scope = deployment.Current.Services.CreateScope();
        var handler = scope.ServiceProvider.GetRequiredService<ICommandHandler<PublishPose, PoseId>>();
        var pose = new PublishPose(
            PoseName.Create(name).Value!,
            Difficulty.Create(DifficultyLevel.FromCode(baseDifficulty).Value, DifficultyLevel.FromCode(flyerDifficulty).Value).Value!,
            FlowBoundaries.Create(canStartFlow, canEndFlow).Value!,
            Source: null);
        var result = await handler.Handle(pose, CancellationToken.None);
        if (result.IsFailure) throw new InvalidOperationException($"Cannot publish the pose {name}: {result.Error}.");
    }

    /// <summary>
    /// Publishes a transition between two published poses, found by name in the catalog list, through the PublishTransition
    /// command (story 7, ADR 0028): an @Integration feature only, transitions live in the database.
    /// </summary>
    public async Task PublishTransition(
        string from, string to, string? name, string baseDifficulty, string flyerDifficulty, string? description,
        IReadOnlyList<string>? tags = null)
    {
        if (!IntegrationDatabase.IsUsedBy(scenario.ScenarioInfo))
            throw new InvalidOperationException("Les transitions publiées demandent une fonctionnalité @Integration.");

        using var client = deployment.Current.CreateClient();
        var list = await client.GetFromJsonAsync<PoseList>(new Uri("/catalog/poses", UriKind.Relative));
        PoseId IdOf(string pose) => new(list!.Poses.Single(p => p.Name == pose).Id);

        using var scope = deployment.Current.Services.CreateScope();
        var handler = scope.ServiceProvider.GetRequiredService<ICommandHandler<PublishTransition, TransitionId>>();
        var transition = new PublishTransition(
            IdOf(from),
            IdOf(to),
            TransitionName.CreateOptional(name).Value,
            Difficulty.FromCodes(baseDifficulty, flyerDifficulty).Value!,
            TransitionDescription.CreateOptional(description).Value,
            Source: null,
            await TagNames.IdsOf(client, tags ?? []));
        var result = await handler.Handle(transition, CancellationToken.None);
        if (result.IsFailure) throw new InvalidOperationException($"Cannot publish the transition from {from} to {to}: {result.Error}.");
    }

    private sealed record PoseList(IReadOnlyList<PoseListItem> Poses);

    private sealed record PoseListItem(Guid Id, string Name);
}
