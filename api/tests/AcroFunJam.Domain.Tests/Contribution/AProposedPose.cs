using AcroFunJam.Domain.Contribution;

namespace AcroFunJam.Domain.Tests.Contribution;

/// <summary>Test data builder: a valid proposed pose, Throne by default.</summary>
internal static class AProposedPose
{
    public static ProposedPose Named(string name) =>
        ProposedPose.Create(name, "beginner", "discovery", canStartFlow: true, canEndFlow: true).Value!;
}
