using AcroFunJam.Domain.Common;

namespace AcroFunJam.Domain.SharedKernel;

/// <summary>
/// Expected errors on the content of a video (story 12, ADR 0041): neutral <c>video.*</c> codes, so that a video proposed by a
/// user (story 12b) refuses with the same codes.
/// </summary>
public static class VideoContentErrors
{
    public static readonly Error FileRequired = new("video.file-required", "Choisis une vidéo.");

    public static readonly Error FormatNotAccepted =
        new("video.format-not-accepted", "Ce fichier n'est pas une vidéo MP4, MOV ou WebM. Choisis une autre vidéo.");

    public static readonly Error TooLarge =
        new("video.too-large", "Cette vidéo doit peser 100 Mo au plus. Filme-la en 1080p, ou raccourcis-la sur ton appareil, puis choisis-la de nouveau.");

    public static readonly Error TooShort =
        new("video.too-short", $"Cette vidéo dure moins de {VideoDuration.MinSeconds} secondes : une transition ne se montre pas en moins. Choisis une autre vidéo.");

    public static readonly Error TooSmall =
        new("video.too-small", $"Il faut au moins {VideoDimensions.MinShortSide} pixels sur le plus petit côté. Choisis une vidéo plus grande.");

    public static readonly Error Unreadable = new("video.unreadable", "Cette vidéo n'a pas pu être lue. Choisis une autre vidéo.");

    public static readonly Error CaptionRequired = new("video.caption-required", "Décris la vidéo : la légende est obligatoire.");

    public static readonly Error CaptionTooLong =
        new("video.caption-too-long", $"La légende ne doit pas dépasser {VideoCaption.MaxLength} caractères.");

    public static readonly Error CreditRequired =
        new("video.credit-required", "Indique le crédit de la vidéo : la personne, le duo ou le collectif à qui elle appartient.");

    public static readonly Error CreditTooLong =
        new("video.credit-too-long", $"Le crédit ne doit pas dépasser {VideoCredit.MaxLength} caractères.");

    public static readonly Error CreditNotAnAuthor =
        new("video.credit-not-an-author", "Le crédit doit nommer à qui appartient la vidéo. Si tu ne sais pas à qui elle appartient, n'ajoute pas cette vidéo.");

    public static readonly Error DescriptionTooLong =
        new("video.description-too-long", $"La description ne doit pas dépasser {VideoDescription.MaxLength} caractères.");

    public static readonly Error RightsConfirmationRequired =
        new("video.rights-confirmation-required", "Confirme tes droits sur la vidéo et l'accord des personnes filmées.");

    /// <summary>The video lasts 31 seconds or more: the seconds are truncated in the message (31,7 s: « dure 31 secondes », V6).</summary>
    public static VideoTooLongError TooLong(int durationSeconds) => new(durationSeconds);
}

/// <summary>A video too long (V6), with its duration in whole seconds, truncated, given to the client (ADR 0041).</summary>
public sealed record VideoTooLongError(int DurationSeconds) : Error(
    "video.too-long",
    $"Cette vidéo dure {DurationSeconds} secondes : {VideoDuration.MaxSecondsSaid} secondes au plus. Raccourcis-la sur ton appareil, puis choisis-la de nouveau.");
