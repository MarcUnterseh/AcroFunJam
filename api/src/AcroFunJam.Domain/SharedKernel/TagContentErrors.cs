using AcroFunJam.Domain.Common;

namespace AcroFunJam.Domain.SharedKernel;

/// <summary>Expected errors on the content of a tag (story 8, ADR 0032, ADR 0034).</summary>
public static class TagContentErrors
{
    public static readonly Error NameRequired = new("tag.name-required", "Le nom de l'étiquette est obligatoire.");

    public static readonly Error NameWithoutLetterOrDigit =
        new("tag.name-without-letter-or-digit", "Le nom de l'étiquette doit contenir une lettre ou un chiffre.");

    public static readonly Error NameTooLong =
        new("tag.name-too-long", $"Le nom de l'étiquette ne doit pas dépasser {TagName.MaxLength} caractères.");

    public static readonly Error DescriptionRequired = new("tag.description-required", "La description de l'étiquette est obligatoire.");

    public static readonly Error DescriptionTooLong =
        new("tag.description-too-long", $"La description de l'étiquette ne doit pas dépasser {DescriptionMaxLength} caractères.");

    /// <summary>Maximum length of a description (<c>TagDescription</c>, Catalog), in characters (code points).</summary>
    public const int DescriptionMaxLength = 200;
}
