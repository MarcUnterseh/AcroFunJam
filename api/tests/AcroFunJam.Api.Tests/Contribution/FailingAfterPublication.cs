using AcroFunJam.Application.Contribution;
using AcroFunJam.Domain.Common;
using AcroFunJam.Domain.Contribution;
using AcroFunJam.Infrastructure.ContextIntegration;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace AcroFunJam.Api.Tests.Contribution;

/// <summary>Publishes for real, then fails: a failure after the publication within the same transaction.</summary>
internal sealed class FailingAfterPublication(CatalogPublisher publisher) : ICatalogPublisher
{
    public static readonly Error Injected = new("test.injected", "Échec injecté après la publication.");

    public async Task<Result<bool>> PublishPose(PoseProposalId source, ProposedPose pose, CancellationToken ct)
    {
        (await publisher.PublishPose(source, pose, ct)).IsSuccess.ShouldBeTrue();
        return Injected;
    }

    /// <summary>The same Api, whose catalog publisher fails after publishing.</summary>
    public static WebApplicationFactory<Program> In(ApiWithDatabase api) =>
        api.WithWebHostBuilder(builder => builder.ConfigureTestServices(services =>
        {
            services.AddScoped<CatalogPublisher>();
            services.RemoveAll<ICatalogPublisher>();
            services.AddScoped<ICatalogPublisher, FailingAfterPublication>();
        }));
}
