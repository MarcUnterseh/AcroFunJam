using AcroFunJam.Domain.Common;

namespace AcroFunJam.Domain.SharedKernel;

/// <summary>
/// Expected errors on the content of a transition, shared by Catalog and Contribution (ADR 0028). Its difficulties follow the
/// rules of the scale, with the <c>pose.*</c> codes of <see cref="PoseContentErrors"/>.
/// </summary>
public static class TransitionContentErrors
{
    public static readonly Error NameWithoutLetterOrDigit =
        new("transition.name-without-letter-or-digit", "Le nom de la transition doit contenir une lettre ou un chiffre.");

    public static readonly Error NameTooLong =
        new("transition.name-too-long", $"Le nom de la transition ne doit pas dépasser {TransitionName.MaxLength} caractères.");

    public static readonly Error DescriptionTooLong =
        new("transition.description-too-long", $"La description de la transition ne doit pas dépasser {TransitionDescription.MaxLength} caractères.");
}
