using AcroFunJam.Application.Catalog;
using AcroFunJam.Application.Catalog.ListPublishedPoses;
using AcroFunJam.Application.Common;
using AcroFunJam.Application.Contribution;
using AcroFunJam.Application.Identity;
using AcroFunJam.Application.Identity.GetAccountEmails;
using AcroFunJam.Infrastructure.ContextIntegration;
using AcroFunJam.Infrastructure.Persistence;
using AcroFunJam.Infrastructure.Persistence.Catalog;
using AcroFunJam.Infrastructure.Persistence.Contribution;
using AcroFunJam.Infrastructure.Persistence.Identity;
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
        services.AddScoped<TrackedAggregates>();
        services.AddScoped<IUnitOfWork, EfUnitOfWork>();

        // Catalog
        services.AddSingleton(CatalogUniqueConstraints.PoseNameKey);
        services.AddScoped<IPublishedPosesReader, EfPublishedPosesReader>();
        services.AddScoped<IPoseRepository, EfPoseRepository>();

        // Identity
        services.AddScoped<IAccountRepository, EfAccountRepository>();
        services.AddScoped<IAccountEmailsReader, EfAccountEmailsReader>();

        // Contribution
        services.AddSingleton(ContributionUniqueConstraints.PendingPoseNameKey);
        services.AddSingleton(ContributionConcurrencyConflicts.PoseProposalDecided);
        services.AddScoped<IPoseProposalRepository, EfPoseProposalRepository>();
        services.AddScoped<IPendingPoseProposalsReader, EfPendingPoseProposalsReader>();

        // Anti-corruption layers between contexts (ADR 0016)
        services.AddScoped<IContributors, IdentityContributors>();
        services.AddScoped<IValidators, IdentityValidators>();
        services.AddScoped<IContributorEmails, IdentityContributorEmails>();
        services.AddScoped<ICatalogPublisher, CatalogPublisher>();
        services.AddScoped<ICatalogPoseNames, CatalogPoseNames>();
        services.AddScoped<IPoseNameReservation, PgPoseNameReservation>(); // names of both contexts (ADR 0017)

        return services;
    }
}
