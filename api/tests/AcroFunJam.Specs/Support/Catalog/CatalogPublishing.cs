using AcroFunJam.Application.Catalog.PublishPose;
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
}
