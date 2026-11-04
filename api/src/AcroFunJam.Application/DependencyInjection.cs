using AcroFunJam.Application.Catalog.IsPoseNamePublished;
using AcroFunJam.Application.Catalog.ListPublishedPoses;
using AcroFunJam.Application.Catalog.PublishPose;
using AcroFunJam.Domain.Catalog;
using AcroFunJam.Application.Common;
using AcroFunJam.Application.Contribution;
using AcroFunJam.Application.Contribution.AcceptPoseProposal;
using AcroFunJam.Application.Contribution.CountPendingPoseProposals;
using AcroFunJam.Application.Contribution.GetPendingPoseProposals;
using AcroFunJam.Application.Contribution.ProposePose;
using AcroFunJam.Application.Contribution.RejectPoseProposal;
using AcroFunJam.Application.Identity.AssignRole;
using AcroFunJam.Application.Identity.BootstrapInitialAdministrator;
using AcroFunJam.Application.Identity.GetAccountEmails;
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
        services.AddScoped<IQueryHandler<GetAccountEmails, IReadOnlyDictionary<AccountId, EmailAddress>>, GetAccountEmailsHandler>();
        services.AddScoped<ICommandHandler<ProposePose, PoseProposalDto>, ProposePoseHandler>();
        services.AddScoped<IQueryHandler<GetPendingPoseProposals, IReadOnlyList<PendingPoseProposalDto>>, GetPendingPoseProposalsHandler>();
        services.AddScoped<IQueryHandler<CountPendingPoseProposals, int>, CountPendingPoseProposalsHandler>();
        services.AddScoped<ICommandHandler<AcceptPoseProposal, DecidedPoseProposalDto>, AcceptPoseProposalHandler>();
        services.AddScoped<ICommandHandler<RejectPoseProposal, DecidedPoseProposalDto>, RejectPoseProposalHandler>();
        return services;
    }
}
