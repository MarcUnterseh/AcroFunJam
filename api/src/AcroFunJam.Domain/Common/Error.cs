namespace AcroFunJam.Domain.Common;

/// <summary>Expected business error, with a stable code <c>&lt;context&gt;.&lt;rule&gt;</c>.</summary>
public sealed record Error(string Code, string Message);
