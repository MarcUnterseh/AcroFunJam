namespace AcroFunJam.Application.Catalog.SeedInitialTagList;

/// <summary>
/// Seeds the list with the initial tags, once: without effect when the list exists, so that a new deployment never brings
/// back a removed tag (story 8, L1, ADR 0032). A list seeded at an older revision is brought up to this one (story 9a, A1,
/// A2, ADR 0035). Run at each start-up; the revision is the current one unless stated (the scenarios).
/// </summary>
public sealed record SeedInitialTagList(int? Revision = null);
