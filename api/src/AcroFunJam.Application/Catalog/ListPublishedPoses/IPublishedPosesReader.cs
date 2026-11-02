namespace AcroFunJam.Application.Catalog.ListPublishedPoses;

/// <summary>Port: reads the poses published in the catalog.</summary>
public interface IPublishedPosesReader
{
    Task<IReadOnlyList<PublishedPoseSummary>> GetPublishedPoses(CancellationToken ct);
}
