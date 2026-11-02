using AcroFunJam.Application.Catalog.ListPublishedPoses;
using AcroFunJam.Application.Common;
using Microsoft.Extensions.DependencyInjection;

namespace AcroFunJam.Application;

public static class DependencyInjection
{
    /// <summary>Registers the use case handlers (explicitly, one line per handler).</summary>
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddScoped<IQueryHandler<ListPublishedPoses, IReadOnlyList<PublishedPoseSummary>>, ListPublishedPosesHandler>();
        return services;
    }
}
