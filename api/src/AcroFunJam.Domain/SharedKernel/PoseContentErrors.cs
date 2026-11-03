using AcroFunJam.Domain.Common;

namespace AcroFunJam.Domain.SharedKernel;

/// <summary>Expected errors on the content of a pose, shared by Catalog and Contribution (ADR 0015).</summary>
public static class PoseContentErrors
{
    public static readonly Error NameRequired = new("pose.name-required", "Le nom de la pose est obligatoire.");

    public static readonly Error NameTooLong =
        new("pose.name-too-long", $"Le nom de la pose ne doit pas dépasser {PoseName.MaxLength} caractères.");

    public static readonly Error BaseDifficultyRequired = new("pose.base-difficulty-required", "La difficulté base est obligatoire.");

    public static readonly Error FlyerDifficultyRequired = new("pose.flyer-difficulty-required", "La difficulté flyer est obligatoire.");

    public static readonly Error CanStartFlowRequired =
        new("pose.can-start-flow-required", "Il faut préciser si la pose peut commencer un flow.");

    public static readonly Error CanEndFlowRequired =
        new("pose.can-end-flow-required", "Il faut préciser si la pose peut terminer un flow.");

    /// <summary>Longest part of the received value quoted back in the message (the value comes from the client).</summary>
    private const int QuotedValueMaxLength = 30;

    public static Error UnknownDifficultyLevel(string? code) =>
        new("pose.unknown-difficulty-level", $"Le niveau de difficulté \"{Quoted(code)}\" n'existe pas.");

    private static string? Quoted(string? value) =>
        value is { Length: > QuotedValueMaxLength } ? string.Concat(value.AsSpan(0, QuotedValueMaxLength), "…") : value;
}
