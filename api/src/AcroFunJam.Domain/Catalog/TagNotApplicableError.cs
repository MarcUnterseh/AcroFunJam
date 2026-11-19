using AcroFunJam.Domain.Common;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Domain.Catalog;

/// <summary>
/// Tags chosen for an element that do not apply to it (« contrepoids », reserved to the poses, on a transition: story 9a,
/// A9, ADR 0035): the refusal tells them, so that the site names them.
/// </summary>
public sealed record TagNotApplicableError(TagSet Tags)
    : Error(ErrorCode, "Une étiquette choisie ne s'applique pas à cet élément.")
{
    public const string ErrorCode = "catalog.tag-not-applicable";

    /// <summary>Why tags chosen through the list are refused, if they are: not in the list first, then not applicable.</summary>
    public static Error? Of(TagChoice choice)
    {
        ArgumentNullException.ThrowIfNull(choice);
        if (choice.NotInList.Count > 0) return new TagNotInListError(choice.NotInList);
        if (choice.NotApplicable.Count > 0) return new TagNotApplicableError(choice.NotApplicable);
        return null;
    }
}
