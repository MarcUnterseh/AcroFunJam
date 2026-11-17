using AcroFunJam.Domain.Common;

namespace AcroFunJam.Domain.Catalog;

/// <summary>The removal of a tag refused while transitions or pending proposals carry it (L10): the refusal lists them (ADR 0034).</summary>
public sealed record TagCarriedError(TagCarriers Carriers)
    : Error(ErrorCode, "Cette étiquette ne peut pas être retirée tant que des transitions ou des propositions en attente la portent.")
{
    public const string ErrorCode = "catalog.tag-carried";
}
