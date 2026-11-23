using AcroFunJam.Application.Catalog.GetPosePage;
using AcroFunJam.Application.Catalog.GetPublishedGraph;
using AcroFunJam.Application.Catalog.ListPublishedPoses;
using AcroFunJam.Application.Catalog;
using AcroFunJam.Application.Common;
using AcroFunJam.Application.Contribution;
using AcroFunJam.Application.FlowGeneration;
using AcroFunJam.Application.Identity.GetAccountEmails;
using AcroFunJam.Application.Identity;
using AcroFunJam.Domain.FlowGeneration;
using AcroFunJam.Infrastructure.ContextIntegration;
using AcroFunJam.Infrastructure.FlowGeneration;
using AcroFunJam.Infrastructure.Persistence.Catalog;
using AcroFunJam.Infrastructure.Persistence.Contribution;
using AcroFunJam.Infrastructure.Persistence.Identity;
using AcroFunJam.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

using AcroFunJam.Infrastructure.Photos;

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
        services.AddSingleton(CatalogConcurrencyConflicts.PoseRevisedMeanwhile);
        services.AddScoped<IPublishedPosesReader, EfPublishedPosesReader>();
        services.AddScoped<IPublishedGraphReader, EfPublishedGraphReader>();
        services.AddScoped<IPoseRepository, EfPoseRepository>();
        services.AddSingleton(CatalogUniqueConstraints.TransitionNamedSlot);
        services.AddSingleton(CatalogUniqueConstraints.TransitionUnnamedSlot);
        services.AddScoped<ITransitionRepository, EfTransitionRepository>();
        services.AddScoped<IPoseTransitionsReader, EfPoseTransitionsReader>();
        services.AddSingleton(CatalogUniqueConstraints.TagNameKey);
        services.AddScoped<ITagListRepository, EfTagListRepository>();
        services.AddScoped<ITagCarriersReader, EfTagCarriersReader>();
        services.AddScoped<ITagListLock, PgTagListLock>(); // shared by the writers of tags, exclusive for a removal (ADR 0033)
        services.AddScoped<IPosePhotosRepository, EfPosePhotosRepository>();
        services.AddScoped<IPosePhotosLock, PgPosePhotosLock>(); // pose-photos:<id>, independent of the lock of the pose (ADR 0039)
        services.AddSingleton<IPhotoProcessor, MagickPhotoProcessor>();
        services.AddSingleton(configuration.GetSection(PhotoStorageOptions.Section).Get<PhotoStorageOptions>() ?? new PhotoStorageOptions());
        services.AddSingleton<IPhotoStorage, S3PhotoStorage>();

        // Identity
        services.AddScoped<IAccountRepository, EfAccountRepository>();
        services.AddScoped<IAccountEmailsReader, EfAccountEmailsReader>();

        // Contribution
        services.AddSingleton(ContributionUniqueConstraints.PendingPoseNameKey);
        services.AddSingleton(ContributionUniqueConstraints.PendingRevisionReservedNameKey);
        services.AddSingleton(ContributionUniqueConstraints.PendingRevisionOfPose);
        services.AddSingleton(ContributionUniqueConstraints.PendingTransitionNamedSlot);
        services.AddSingleton(ContributionUniqueConstraints.PendingTransitionUnnamedSlot);
        services.AddSingleton(ContributionConcurrencyConflicts.PoseProposalDecided);
        services.AddSingleton(ContributionConcurrencyConflicts.PoseRevisionProposalDecided);
        services.AddSingleton(ContributionConcurrencyConflicts.TransitionProposalDecided);
        services.AddScoped<IPoseProposalRepository, EfPoseProposalRepository>();
        services.AddScoped<IPendingPoseProposalsReader, EfPendingPoseProposalsReader>();
        services.AddScoped<IMyPoseProposalsReader, EfMyPoseProposalsReader>();
        services.AddScoped<IPoseRevisionProposalRepository, EfPoseRevisionProposalRepository>();
        services.AddScoped<IPendingPoseRevisionsReader, EfPendingPoseRevisionsReader>();
        services.AddScoped<IMyPoseRevisionsReader, EfMyPoseRevisionsReader>();
        services.AddScoped<ITransitionProposalRepository, EfTransitionProposalRepository>();
        services.AddScoped<IPendingTransitionProposalsReader, EfPendingTransitionProposalsReader>();
        services.AddScoped<IMyTransitionProposalsReader, EfMyTransitionProposalsReader>();

        // Anti-corruption layers between contexts (ADR 0016)
        services.AddScoped<IContributors, IdentityContributors>();
        services.AddScoped<IValidators, IdentityValidators>();
        services.AddScoped<IContributorEmails, IdentityContributorEmails>();
        services.AddScoped<ICatalogPublisher, CatalogPublisher>();
        services.AddScoped<ICatalogPoseNames, CatalogPoseNames>();
        services.AddScoped<ICatalogPoses, CatalogPoses>();
        services.AddScoped<ICatalogTransitions, CatalogTransitions>();
        services.AddScoped<ICatalogTags, CatalogTags>();
        services.AddScoped<IPublishedGraphSource, CatalogPublishedGraph>();
        services.AddSingleton<IRandomSource, SystemRandomSource>();
        services.AddScoped<IPendingTagCarriers, ContributionPendingTagCarriers>();
        services.AddScoped<IPendingPoseRevisions, ContributionPendingPoseRevisions>(); // read by the Catalog tagging a pose (ADR 0036)
        services.AddScoped<IPoseTaggingLock, PgPoseTaggingLock>(); // read by the Catalog removing a tag (ADR 0033)
        services.AddScoped<IPoseReservation, PgPoseReservation>(); // names of both contexts (ADR 0017)
        services.AddScoped<ITransitionReservation, PgTransitionReservation>(); // places between poses of both contexts (ADR 0029)

        return services;
    }
}
