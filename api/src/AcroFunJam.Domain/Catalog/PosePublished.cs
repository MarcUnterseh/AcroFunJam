using AcroFunJam.Domain.Common;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Domain.Catalog;

/// <summary>A pose has been published in the catalog, from a proposal or not.</summary>
public sealed record PosePublished(PoseId PoseId, PoseName Name, SourceProposalId? SourceProposalId, DateTimeOffset OccurredAt) : IDomainEvent;
