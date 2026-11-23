using AcroFunJam.Domain.Common;

namespace AcroFunJam.Domain.SharedKernel;

/// <summary>
/// Expected errors on the content of a photo (story 10, ADR 0039): neutral <c>photo.*</c> codes, so that a photo proposed by a
/// user (story 11) refuses with the same codes.
/// </summary>
public static class PhotoContentErrors
{
    public static readonly Error AltTextRequired = new("photo.alt-text-required", "Décris la photo : le texte alternatif est obligatoire.");

    public static readonly Error AltTextTooLong =
        new("photo.alt-text-too-long", $"Le texte alternatif ne doit pas dépasser {AltText.MaxLength} caractères.");

    public static readonly Error CreditRequired =
        new("photo.credit-required", "Indique le crédit de la photo : le nom de la personne qui l'a prise.");

    public static readonly Error CreditTooLong =
        new("photo.credit-too-long", $"Le crédit ne doit pas dépasser {PhotoCredit.MaxLength} caractères.");

    public static readonly Error CreditNotAnAuthor =
        new("photo.credit-not-an-author", "Le crédit doit nommer la personne qui a pris la photo. Si tu ne sais pas qui l'a prise, n'ajoute pas cette photo.");

    public static readonly Error FileRequired = new("photo.file-required", "Choisis une photo.");

    public static readonly Error FormatNotAccepted =
        new("photo.format-not-accepted", "Ce fichier n'est pas une photo JPEG, PNG, WebP ou HEIC. Choisis une autre photo.");

    public static readonly Error TooLarge = new("photo.too-large", "Cette photo doit peser 10 Mo au plus. Choisis une photo plus légère.");

    public static readonly Error TooSmall =
        new("photo.too-small", $"Il faut au moins {PhotoDimensions.MinShortSide} pixels sur le plus petit côté. Choisis une photo plus grande.");

    public static readonly Error Unreadable = new("photo.unreadable", "Cette photo n'a pas pu être lue. Choisis une autre photo.");

    public static readonly Error RightsConfirmationRequired =
        new("photo.rights-confirmation-required", "Confirme tes droits sur la photo et l'accord des personnes photographiées.");
}
