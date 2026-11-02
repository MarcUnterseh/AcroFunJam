using AcroFunJam.Application.Catalog.ListPublishedPoses;
using AcroFunJam.Application.Identity;
using AcroFunJam.Infrastructure.Persistence;
using AcroFunJam.Infrastructure.Persistence.Identity;
using AcroFunJam.Infrastructure.Persistence.Catalog;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace AcroFunJam.Infrastructure;

public static class DependencyInjection
{
    /// <summary>Registers the adapters (EF Core persistence, clock, external services).</summary>
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        ArgumentNullException.ThrowIfNull(configuration);

        services.AddSingleton(TimeProvider.System);
        services.AddDbContext<AcroFunJamDbContext>(options =>
            options.UseNpgsql(configuration.GetConnectionString("AcroFunJam")));
        services.AddScoped<IPublishedPosesReader, EfPublishedPosesReader>();
        services.AddScoped<IAccountRepository, EfAccountRepository>();

        return services;
    }
}
