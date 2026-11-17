using AcroFunJam.Domain.Common;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Domain.Contribution;

/// <summary>
/// Tags chosen for a proposed or retained transition that are not in the list (unknown, or removed meanwhile, ADR 0033): the refusal
/// tells them, so that the site names them and takes them out of the kept input (ADR 0034).
/// </summary>
public sealed record ProposedTagsNotInListError(TagSet Tags)
    : Error(ErrorCode, "Une étiquette choisie n'est pas dans la liste des étiquettes.")
{
    public const string ErrorCode = "contribution.tag-not-in-list";
}
