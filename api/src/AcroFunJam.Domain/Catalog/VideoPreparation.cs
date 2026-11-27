namespace AcroFunJam.Domain.Catalog;

/// <summary>
/// Where the preparation of a video stands (story 12, V11, Q298): in preparation after the addition, then ready or impossible to
/// prepare. Only a ready video is presented to the visitors.
/// </summary>
public enum VideoPreparation
{
    InPreparation,
    Ready,
    Failed,
}
