using AcroFunJam.Domain.Common;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Domain.Catalog;

/// <summary>A pose has been published in the catalog, from a proposal or not, with its tags (story 9a).</summary>
public sealed record PosePublished(PoseId PoseId, PoseName Name, SourceProposalId? SourceProposalId, DateTimeOffset OccurredAt) : IDomainEvent
{
    public TagSet Tags { get; init; } = TagSet.Empty;
}
