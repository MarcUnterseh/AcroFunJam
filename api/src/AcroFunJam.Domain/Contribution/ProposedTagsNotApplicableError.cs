using AcroFunJam.Domain.Common;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Domain.Contribution;

/// <summary>
/// Tags chosen for a proposed or retained element that do not apply to it (story 9a, A9, ADR 0035): the refusal tells them, so
/// that the site names them and takes them out of the kept input.
/// </summary>
public sealed record ProposedTagsNotApplicableError(TagSet Tags)
    : Error(ErrorCode, "Une étiquette choisie ne s'applique pas à cet élément.")
{
    public const string ErrorCode = "contribution.tag-not-applicable";

    /// <summary>Why tags chosen through the list are refused, if they are: not in the list first, then not applicable.</summary>
    public static Error? Of(TagChoice? choice)
    {
        if (choice is null) return null;
        if (choice.NotInList.Count > 0) return new ProposedTagsNotInListError(choice.NotInList);
        if (choice.NotApplicable.Count > 0) return new ProposedTagsNotApplicableError(choice.NotApplicable);
        return null;
    }
}
