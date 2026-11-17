namespace AcroFunJam.Domain.Common;

/// <summary>
/// Expected business error, with a stable code <c>&lt;context&gt;.&lt;rule&gt;</c>. Not sealed: a refusal that must say more
/// (the tags not in the list, the carriers of a tag, ADR 0033) derives from it, and is compared by its code.
/// </summary>
#pragma warning disable CA1012 // A record with a public constructor: the errors are its instances.
public record Error(string Code, string Message);
#pragma warning restore CA1012
