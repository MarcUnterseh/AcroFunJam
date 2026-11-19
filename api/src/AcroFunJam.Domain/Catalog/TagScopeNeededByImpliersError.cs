using AcroFunJam.Domain.Common;

namespace AcroFunJam.Domain.Catalog;

/// <summary>
/// The implied tag would stop applying where tags implying it apply (« dynamique » restricted to the poses while « pop »
/// applies to the transitions, story 9a, A5): the implying tags, in catalog order.
/// </summary>
public sealed record TagScopeNeededByImpliersError(IReadOnlyList<Tag> ImpliedBy)
    : Error(ErrorCode, "Les étiquettes qui ajoutent celle-ci s'appliquent là où elle cesserait de s'appliquer.")
{
    public const string ErrorCode = "catalog.tag-scope-needed-by-impliers";
}
