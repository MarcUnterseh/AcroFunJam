using AcroFunJam.Application.Catalog.ListPublishedPoses;

namespace AcroFunJam.Application.Tests.Catalog;

/// <summary>In-memory fake of the <see cref="IPublishedPosesReader"/> port.</summary>
internal sealed class FakePublishedPosesReader(IEnumerable<PublishedPoseSummary> publishedPoses) : IPublishedPosesReader
{
    private readonly List<PublishedPoseSummary> _publishedPoses = [.. publishedPoses];

    public Task<IReadOnlyList<PublishedPoseSummary>> GetPublishedPoses(CancellationToken ct) =>
        Task.FromResult<IReadOnlyList<PublishedPoseSummary>>(_publishedPoses.AsReadOnly());
}
