using AcroFunJam.Domain.Identity;

namespace AcroFunJam.Application.Identity.BootstrapInitialAdministrator;

/// <summary>
/// Makes the account designated by configuration administrator while no administrator exists.
/// Idempotent: run at start-up and after each registration (ADR 0008).
/// </summary>
public sealed record BootstrapInitialAdministrator(EmailAddress? DesignatedEmail);
