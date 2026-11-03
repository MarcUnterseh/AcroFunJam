using AcroFunJam.Application.Catalog.IsPoseNamePublished;
using AcroFunJam.Application.Catalog.ListPublishedPoses;
using AcroFunJam.Application.Catalog.PublishPose;
using AcroFunJam.Domain.Catalog;
using AcroFunJam.Application.Common;
using AcroFunJam.Application.Contribution.ProposePose;
using AcroFunJam.Application.Identity.AssignRole;
using AcroFunJam.Application.Identity.BootstrapInitialAdministrator;
using AcroFunJam.Application.Identity.GetMyAccount;
using AcroFunJam.Application.Identity.RevokeRole;
using AcroFunJam.Domain.Identity;
using Microsoft.Extensions.DependencyInjection;

namespace AcroFunJam.Application;

public static class DependencyInjection
{
    /// <summary>Registers the use case handlers (explicitly, one line per handler).</summary>
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddScoped<IQueryHandler<ListPublishedPoses, IReadOnlyList<PublishedPoseSummary>>, ListPublishedPosesHandler>();
        services.AddScoped<ICommandHandler<PublishPose, PoseId>, PublishPoseHandler>();
        services.AddScoped<IQueryHandler<IsPoseNamePublished, bool>, IsPoseNamePublishedHandler>();
        services.AddScoped<IQueryHandler<GetMyAccount, MyAccountDto>, GetMyAccountHandler>();
        services.AddScoped<ICommandHandler<AssignRole, bool>, AssignRoleHandler>();
        services.AddScoped<ICommandHandler<RevokeRole, bool>, RevokeRoleHandler>();
        services.AddScoped<ICommandHandler<BootstrapInitialAdministrator, bool>, BootstrapInitialAdministratorHandler>();
        services.AddScoped<ICommandHandler<ProposePose, PoseProposalDto>, ProposePoseHandler>();
        return services;
    }
}
