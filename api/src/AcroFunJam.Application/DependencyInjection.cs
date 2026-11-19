using AcroFunJam.Application.Catalog;
using AcroFunJam.Application.Catalog.AddTag;
using AcroFunJam.Application.Catalog.ChangeTag;
using AcroFunJam.Application.Catalog.ListTags;
using AcroFunJam.Application.Catalog.RemoveTag;
using AcroFunJam.Application.Catalog.SeedInitialTagList;
using AcroFunJam.Application.Catalog.TagPose;
using AcroFunJam.Application.Catalog.TagTransition;
using AcroFunJam.Application.Catalog.GetTagNames;
using AcroFunJam.Application.Catalog.GetPublishedGraph;
using AcroFunJam.Application.FlowGeneration.GenerateFlow;
using AcroFunJam.Application.Catalog.ChooseTags;
using AcroFunJam.Application.Contribution.GetPendingPoseProposalsCarryingTag;
using AcroFunJam.Application.Contribution.GetPendingPoseRevisionsCarryingTag;
using AcroFunJam.Application.Contribution.GetPendingTransitionProposalsCarryingTag;
using AcroFunJam.Application.Catalog.GetPublishedPoseNames;
using AcroFunJam.Application.Catalog.GetPosePage;
using AcroFunJam.Application.Catalog.IsTransitionSlotPublished;
using AcroFunJam.Application.Catalog.PublishTransition;
using AcroFunJam.Application.Contribution.ProposeTransition;
using AcroFunJam.Application.Contribution.AcceptTransitionProposal;
using AcroFunJam.Application.Contribution.RejectTransitionProposal;
using AcroFunJam.Domain.SharedKernel;
using AcroFunJam.Application.Catalog.IsPoseNamePublished;
using AcroFunJam.Application.Catalog.ListPublishedPoses;
using AcroFunJam.Application.Catalog.PublishPose;
using AcroFunJam.Domain.Catalog;
using AcroFunJam.Application.Common;
using AcroFunJam.Application.Contribution;
using AcroFunJam.Application.Contribution.AcceptPoseProposal;
using AcroFunJam.Application.Contribution.CountPendingPoseProposals;
using AcroFunJam.Application.Contribution.GetMyProposals;
using AcroFunJam.Application.Contribution.GetPendingPoseProposals;
using AcroFunJam.Application.Contribution.ProposePose;
using AcroFunJam.Application.Contribution.ProposePoseRevision;
using AcroFunJam.Application.Contribution.GetPendingRevisionOfPose;
using AcroFunJam.Application.Contribution.AcceptPoseRevision;
using AcroFunJam.Application.Contribution.RejectPoseRevision;
using AcroFunJam.Application.Catalog.RevisePose;
using AcroFunJam.Application.Contribution.RejectPoseProposal;
using AcroFunJam.Application.Identity.AssignRole;
using AcroFunJam.Application.Identity.BootstrapInitialAdministrator;
using AcroFunJam.Application.Identity.GetAccountEmails;
using AcroFunJam.Application.Identity.GetMyAccount;
using AcroFunJam.Application.Identity.RevokeRole;
using AcroFunJam.Domain.Contribution;
using AcroFunJam.Domain.Identity;
using Microsoft.Extensions.DependencyInjection;

namespace AcroFunJam.Application;

public static class DependencyInjection
{
    /// <summary>Registers the use case handlers (explicitly, one line per handler).</summary>
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddScoped<IQueryHandler<ListPublishedPoses, IReadOnlyList<CatalogPose>>, ListPublishedPosesHandler>();
        services.AddScoped<ICommandHandler<PublishPose, PoseId>, PublishPoseHandler>();
        services.AddScoped<IQueryHandler<IsPoseNamePublished, bool>, IsPoseNamePublishedHandler>();
        services.AddScoped<IQueryHandler<GetMyAccount, MyAccountDto>, GetMyAccountHandler>();
        services.AddScoped<ICommandHandler<AssignRole, bool>, AssignRoleHandler>();
        services.AddScoped<ICommandHandler<RevokeRole, bool>, RevokeRoleHandler>();
        services.AddScoped<ICommandHandler<BootstrapInitialAdministrator, bool>, BootstrapInitialAdministratorHandler>();
        services.AddScoped<IQueryHandler<GetAccountEmails, IReadOnlyDictionary<AccountId, EmailAddress>>, GetAccountEmailsHandler>();
        services.AddScoped<ICommandHandler<ProposePose, PoseProposalDto>, ProposePoseHandler>();
        services.AddScoped<IQueryHandler<GetPendingPoseProposals, IReadOnlyList<PendingProposalDto>>, GetPendingPoseProposalsHandler>();
        services.AddScoped<IQueryHandler<CountPendingPoseProposals, int>, CountPendingPoseProposalsHandler>();
        services.AddScoped<ICommandHandler<AcceptPoseProposal, DecidedPoseProposalDto>, AcceptPoseProposalHandler>();
        services.AddScoped<ICommandHandler<RejectPoseProposal, DecidedPoseProposalDto>, RejectPoseProposalHandler>();
        services.AddScoped<IQueryHandler<GetMyProposals, IReadOnlyList<IMyProposal>>, GetMyProposalsHandler>();
        services.AddScoped<ICommandHandler<ProposePoseRevision, PoseRevisionProposalDto>, ProposePoseRevisionHandler>();
        services.AddScoped<ICommandHandler<AcceptPoseRevision, DecidedPoseRevisionDto>, AcceptPoseRevisionHandler>();
        services.AddScoped<ICommandHandler<RejectPoseRevision, DecidedPoseRevisionDto>, RejectPoseRevisionHandler>();
        services.AddScoped<IQueryHandler<GetPendingRevisionOfPose, PendingRevisionOfPose?>, GetPendingRevisionOfPoseHandler>();
        services.AddScoped<ICommandHandler<RevisePose, PoseVersion>, RevisePoseHandler>();
        services.AddScoped<IQueryHandler<GetPublishedPoseNames, IReadOnlyDictionary<PoseId, PoseName>>, GetPublishedPoseNamesHandler>();
        services.AddScoped<ICommandHandler<ProposeTransition, TransitionProposalDto>, ProposeTransitionHandler>();
        services.AddScoped<ICommandHandler<PublishTransition, TransitionId>, PublishTransitionHandler>();
        services.AddScoped<ICommandHandler<AcceptTransitionProposal, DecidedTransitionProposalDto>, AcceptTransitionProposalHandler>();
        services.AddScoped<ICommandHandler<RejectTransitionProposal, DecidedTransitionProposalDto>, RejectTransitionProposalHandler>();
        services.AddScoped<IQueryHandler<IsTransitionSlotPublished, bool>, IsTransitionSlotPublishedHandler>();
        services.AddScoped<IQueryHandler<GetPosePage, PosePage>, GetPosePageHandler>();
        services.AddScoped<IQueryHandler<ListTags, IReadOnlyList<TagDto>>, ListTagsHandler>();
        services.AddScoped<ICommandHandler<AddTag, TagDto>, AddTagHandler>();
        services.AddScoped<ICommandHandler<ChangeTag, TagDto>, ChangeTagHandler>();
        services.AddScoped<ICommandHandler<RemoveTag, bool>, RemoveTagHandler>();
        services.AddScoped<ICommandHandler<SeedInitialTagList, bool>, SeedInitialTagListHandler>();
        services.AddScoped<ICommandHandler<TagTransition, TagSet>, TagTransitionHandler>();
        services.AddScoped<ICommandHandler<TagPose, TagSet>, TagPoseHandler>();
        services.AddScoped<IQueryHandler<GetTagNames, IReadOnlyList<NamedTag>>, GetTagNamesHandler>();
        services.AddScoped<IQueryHandler<GetPublishedGraph, PublishedCatalogGraph>, GetPublishedGraphHandler>();
        services.AddScoped<IQueryHandler<GenerateFlow, GeneratedFlow>, GenerateFlowHandler>();
        services.AddScoped<IQueryHandler<ChooseTags, TagChoice>, ChooseTagsHandler>();
        services.AddScoped<IQueryHandler<GetPendingTransitionProposalsCarryingTag, IReadOnlyList<TransitionProposal>>,
            GetPendingTransitionProposalsCarryingTagHandler>();
        services.AddScoped<IQueryHandler<GetPendingPoseProposalsCarryingTag, IReadOnlyList<PoseProposal>>,
            GetPendingPoseProposalsCarryingTagHandler>();
        services.AddScoped<IQueryHandler<GetPendingPoseRevisionsCarryingTag, IReadOnlyList<PoseRevisionProposal>>,
            GetPendingPoseRevisionsCarryingTagHandler>();
        return services;
    }
}
