namespace AcroFunJam.Domain.Catalog;

/// <summary>
/// Who the videos are presented to (story 12, V11): a visitor sees the ready videos only; whoever manages the videos (a validator
/// or an administrator) sees them all, with their preparation.
/// </summary>
public enum VideoAudience
{
    Visitor,
    Manager,
}
