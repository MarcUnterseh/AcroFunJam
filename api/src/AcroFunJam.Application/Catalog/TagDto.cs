using AcroFunJam.Domain.Catalog;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Application.Catalog;

/// <summary>A tag of the list as presented (ADR 0034): with the tag it implies and the number of published transitions carrying it.</summary>
public sealed record TagDto(TagId Id, TagName Name, TagDescription Description, TagId? ImpliedTag, int TransitionCount)
{
    public static TagDto From(Tag tag, int transitionCount)
    {
        ArgumentNullException.ThrowIfNull(tag);
        return new TagDto(tag.Id, tag.Name, tag.Description, tag.ImpliedTag, transitionCount);
    }
}
