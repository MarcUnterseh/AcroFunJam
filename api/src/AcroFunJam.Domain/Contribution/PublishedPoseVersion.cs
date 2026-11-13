using AcroFunJam.Domain.Common;

namespace AcroFunJam.Domain.Contribution;

/// <summary>Version of a published pose as read from the catalog, when a revision of it starts (story 6, ADR 0024).</summary>
public readonly record struct PublishedPoseVersion(int Value)
{
    /// <summary>The version sent with a revision: required, 1 or more.</summary>
    public static Result<PublishedPoseVersion> Create(int? value) =>
        value is >= 1 ? Result<PublishedPoseVersion>.Success(new PublishedPoseVersion(value.Value)) : ContributionErrors.PoseVersionRequired;
}
