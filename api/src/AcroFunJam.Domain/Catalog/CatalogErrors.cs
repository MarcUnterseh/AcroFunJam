using AcroFunJam.Domain.Common;

namespace AcroFunJam.Domain.Catalog;

/// <summary>Expected errors of the Catalog context, with stable codes (ADR 0007).</summary>
public static class CatalogErrors
{
    public static readonly Error PoseNameTaken = new("catalog.pose-name-taken", "Une pose de ce nom existe déjà dans le catalogue.");

    public static readonly Error PoseVersionMismatch =
        new("catalog.pose-version-mismatch", "Cette pose a changé depuis la version attendue.");

    /// <summary>A revision of the pose waits for a decision: the pose is not tagged directly meanwhile (story 9a, D4).</summary>
    public static readonly Error PoseRevisionPending =
        new("catalog.pose-revision-pending", "Une modification de cette pose attend déjà d'être validée.");

    public static readonly Error PoseNotFound = new("catalog.pose-not-found", "Cette pose n'est pas dans le catalogue.");

    /// <summary>A pose has at most 5 photos (story 10, R11).</summary>
    public static readonly Error PhotoLimitReached =
        new("catalog.photo-limit-reached", "Cette pose a déjà 5 photos, le maximum. Retire une photo pour en ajouter une autre.");

    public static readonly Error PhotoNotFound = new("catalog.photo-not-found", "Cette photo n'est pas (ou plus) dans le catalogue.");

    /// <summary>A transition has at most 3 videos, in preparation included (story 12, V15).</summary>
    public static readonly Error VideoLimitReached =
        new("catalog.video-limit-reached", "Cette transition a déjà 3 vidéos, le maximum. Retire une vidéo pour en ajouter une autre.");

    public static readonly Error VideoNotFound = new("catalog.video-not-found", "Cette vidéo n'est pas (ou plus) dans le catalogue.");

    public static readonly Error FromPoseNotFound = new("catalog.from-pose-not-found", "La pose de départ n'est pas dans le catalogue.");

    public static readonly Error ToPoseNotFound = new("catalog.to-pose-not-found", "La pose d'arrivée n'est pas dans le catalogue.");

    public static readonly Error TransitionNameTaken =
        new("catalog.transition-name-taken", "Une transition de ce nom relie déjà ces poses dans le catalogue.");

    public static readonly Error UnnamedTransitionTaken =
        new("catalog.unnamed-transition-taken", "Une transition sans nom relie déjà ces poses dans le catalogue.");

    /// <summary>The tag would apply where the tag it implies does not (« pop » extended to the poses, story 9a, A5).</summary>
    public static readonly Error TagScopeExceedsImplied =
        new("catalog.tag-scope-exceeds-implied", "L'étiquette que celle-ci ajoute ne s'applique pas à tous ces éléments.");

    public static readonly Error TransitionNotFound = new("catalog.transition-not-found", "Cette transition n'est pas dans le catalogue.");

    public static readonly Error TagNameTaken = new("catalog.tag-name-taken", "Une étiquette de ce nom existe déjà dans la liste.");

    public static readonly Error TagNotFound = new("catalog.tag-not-found", "Cette étiquette n'est pas dans la liste.");

    public static readonly Error TagImplied =
        new("catalog.tag-implied", "Cette étiquette ne peut pas être retirée tant qu'une étiquette de la liste l'ajoute.");
}
