namespace AcroFunJam.Domain.Catalog;

/// <summary>Reference of the proposal a pose was published from, for traceability; the Catalog knows nothing more of it.</summary>
public readonly record struct SourceProposalId(Guid Value);
