using AcroFunJam.Domain.Common;

namespace AcroFunJam.Domain.Catalog;

/// <summary>Expected errors of the Catalog context, with stable codes (ADR 0007).</summary>
public static class CatalogErrors
{
    public static readonly Error PoseNameTaken = new("catalog.pose-name-taken", "Une pose de ce nom existe déjà dans le catalogue.");

    public static readonly Error PoseVersionMismatch =
        new("catalog.pose-version-mismatch", "Cette pose a changé depuis la version attendue.");

    public static readonly Error PoseNotFound = new("catalog.pose-not-found", "Cette pose n'est pas dans le catalogue.");

    public static readonly Error FromPoseNotFound = new("catalog.from-pose-not-found", "La pose de départ n'est pas dans le catalogue.");

    public static readonly Error ToPoseNotFound = new("catalog.to-pose-not-found", "La pose d'arrivée n'est pas dans le catalogue.");

    public static readonly Error TransitionNameTaken =
        new("catalog.transition-name-taken", "Une transition de ce nom relie déjà ces poses dans le catalogue.");

    public static readonly Error UnnamedTransitionTaken =
        new("catalog.unnamed-transition-taken", "Une transition sans nom relie déjà ces poses dans le catalogue.");

    public static readonly Error TagNameTaken = new("catalog.tag-name-taken", "Une étiquette de ce nom existe déjà dans la liste.");

    public static readonly Error TagNotFound = new("catalog.tag-not-found", "Cette étiquette n'est pas dans la liste.");

    public static readonly Error TagImplied =
        new("catalog.tag-implied", "Cette étiquette ne peut pas être retirée tant qu'une étiquette de la liste l'ajoute.");
}
