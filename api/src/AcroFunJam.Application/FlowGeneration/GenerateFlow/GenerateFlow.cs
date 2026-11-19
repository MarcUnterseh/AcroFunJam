using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Application.FlowGeneration.GenerateFlow;

/// <summary>Draws a flow at random among the published poses and transitions (story 9): nothing is recorded.</summary>
public sealed record GenerateFlow(
    int? Length,
    string? BaseDifficultyCeiling,
    string? FlyerDifficultyCeiling,
    IReadOnlyCollection<TagId>? RequestedTagIds = null,
    IReadOnlyCollection<TagId>? ExcludedTagIds = null);
