using AcroFunJam.Domain.Common;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Domain.Catalog;

/// <summary>A published pose has been revised, keeping its identity, from a revision proposal (story 6, ADR 0026).</summary>
public sealed record PoseRevised(PoseId PoseId, PoseVersion Version, PoseName Name, SourceProposalId Source, DateTimeOffset OccurredAt) : IDomainEvent;
