using AcroFunJam.Domain.Common;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Domain.Catalog;

/// <summary>
/// Tags chosen for a transition that are not in the list (unknown, or removed meanwhile, ADR 0033): the refusal tells them, so
/// that the site names them (ADR 0034).
/// </summary>
public sealed record TagNotInListError(TagSet Tags)
    : Error(ErrorCode, "Une étiquette choisie n'est pas dans la liste des étiquettes.")
{
    public const string ErrorCode = "catalog.tag-not-in-list";
}
