using AcroFunJam.Domain.Common;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Domain.FlowGeneration;

/// <summary>The refusals of a generation of flow (story 9, ADR 0037), with the codes of the HTTP contract.</summary>
public static class FlowGenerationErrors
{
    public static readonly Error LengthRequired = new("flow-generation.length-required", "Le nombre de transitions est obligatoire.");

    public static readonly Error LengthOutOfRange =
        new("flow-generation.length-out-of-range", $"Le nombre de transitions va de {FlowLength.Min} à {FlowLength.Max}.");

    public static readonly Error BaseDifficultyCeilingRequired =
        new("flow-generation.base-difficulty-ceiling-required", "La difficulté base, au plus, est obligatoire.");

    public static readonly Error FlyerDifficultyCeilingRequired =
        new("flow-generation.flyer-difficulty-ceiling-required", "La difficulté flyer, au plus, est obligatoire.");

    /// <summary>No flow matches the criteria, while the catalog allows some without them (Q197).</summary>
    public static readonly Error CriteriaTooRestrictive =
        new("flow-generation.criteria-too-restrictive", "Critères trop restrictifs : impossible de générer un flow.");

    /// <summary>No flow of 1 to 10 transitions exists in the catalog, even without any criterion (Q198).</summary>
    public static readonly Error CatalogInsufficient =
        new("flow-generation.catalog-insufficient", "Le catalogue ne permet pas encore de générer un flow.");
}

/// <summary>Requested or excluded tags that are not (any longer) in the list of tags (K8): the refusal tells them.</summary>
public sealed record TagsNotInListError(TagSet Tags)
    : Error(ErrorCode, "Une étiquette choisie n'est plus dans la liste des étiquettes.")
{
    public const string ErrorCode = "flow-generation.tag-not-in-list";
}
