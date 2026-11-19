using AcroFunJam.Domain.FlowGeneration;

namespace AcroFunJam.Infrastructure.FlowGeneration;

/// <summary>The chance of a generation (G6, Q195): the shared generator of .NET, no seed exposed.</summary>
public sealed class SystemRandomSource : IRandomSource
{
#pragma warning disable CA5394 // Not a security matter: drawing a flow.
    public int NextIndex(int count) => Random.Shared.Next(count);
#pragma warning restore CA5394
}
