using AcroFunJam.Domain.Catalog;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Application.Catalog;

/// <summary>
/// A tag of the list as presented (ADR 0034, ADR 0035): with the tag it implies, what it applies to and the numbers of published
/// poses and transitions carrying it.
/// </summary>
public sealed record TagDto(
    TagId Id, TagName Name, TagDescription Description, TagScope Scope, TagId? ImpliedTag, int PoseCount, int TransitionCount)
{
    public static TagDto From(Tag tag, int transitionCount, int poseCount = 0)
    {
        ArgumentNullException.ThrowIfNull(tag);
        return new TagDto(tag.Id, tag.Name, tag.Description, tag.Scope, tag.ImpliedTag, poseCount, transitionCount);
    }
}
