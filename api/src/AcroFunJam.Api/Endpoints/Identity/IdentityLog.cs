namespace AcroFunJam.Api.Endpoints.Identity;

/// <summary>Audit trail of role changes (who changed whose role), as structured logs.</summary>
internal static partial class IdentityLog
{
    [LoggerMessage(EventId = 1001, Level = LogLevel.Information, Message = "Role {Role} assigned to {Email} by account {By}")]
    public static partial void RoleAssigned(ILogger logger, string role, string email, Guid by);

    [LoggerMessage(EventId = 1002, Level = LogLevel.Information, Message = "Role {Role} revoked from {Email} by account {By}")]
    public static partial void RoleRevoked(ILogger logger, string role, string email, Guid by);

    [LoggerMessage(EventId = 1003, Level = LogLevel.Warning, Message = "Role change on {Email} refused: {Code}")]
    public static partial void RoleChangeRefused(ILogger logger, string email, string code);

    [LoggerMessage(EventId = 1004, Level = LogLevel.Warning, Message = "Initial administrator {Email} promoted at start-up")]
    public static partial void InitialAdministratorPromoted(ILogger logger, string email);

    [LoggerMessage(EventId = 1005, Level = LogLevel.Information, Message = "Initial administrator {Email} not promoted: account missing or an administrator already exists")]
    public static partial void InitialAdministratorNotPromoted(ILogger logger, string email);

    [LoggerMessage(EventId = 1006, Level = LogLevel.Error, Message = "Initial administrator bootstrap failed: {Code}")]
    public static partial void InitialAdministratorFailed(ILogger logger, string code);
}
