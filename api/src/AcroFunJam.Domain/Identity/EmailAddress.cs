using AcroFunJam.Domain.Common;

namespace AcroFunJam.Domain.Identity;

/// <summary>E-mail address identifying an account; two addresses differing only by case are the same.</summary>
public sealed record EmailAddress
{
    public string Value { get; }

    private EmailAddress(string value) => Value = value;

    /// <summary>A trimmed, non-empty address containing '@'. The identity library performs the full validation.</summary>
    public static Result<EmailAddress> Create(string? raw)
    {
        var value = raw?.Trim();
        return string.IsNullOrEmpty(value) || !value.Contains('@', StringComparison.Ordinal)
            ? IdentityErrors.InvalidEmail
            : Result<EmailAddress>.Success(new EmailAddress(value));
    }

    public bool Equals(EmailAddress? other) =>
        other is not null && string.Equals(Value, other.Value, StringComparison.OrdinalIgnoreCase);

    public override int GetHashCode() => StringComparer.OrdinalIgnoreCase.GetHashCode(Value);
}
