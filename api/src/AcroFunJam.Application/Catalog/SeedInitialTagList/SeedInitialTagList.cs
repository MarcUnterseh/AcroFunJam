namespace AcroFunJam.Application.Catalog.SeedInitialTagList;

/// <summary>
/// Seeds the list with the initial tags, once: without effect when the list exists, so that a new deployment never brings
/// back a removed tag (story 8, L1, ADR 0032). Run at each start-up.
/// </summary>
public sealed record SeedInitialTagList;
