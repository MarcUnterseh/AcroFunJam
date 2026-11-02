using ArchUnitNET.xUnitV3;
using static ArchUnitNET.Fluent.ArchRuleDefinition;

namespace AcroFunJam.Architecture.Tests;

/// <summary>
/// A bounded context never references the types of another one (ddd-patterns skill):
/// it goes through identifiers, integration events or an anti-corruption layer. Only <c>Common</c> is shared.
/// </summary>
public sealed class BoundedContextIsolationTests
{
    // Keep in sync with docs/domain/context-map.md.
    public static TheoryData<string> Contexts() => ["Catalog", "FlowGeneration", "Repertoire", "Contribution", "Identity"];

    [Theory]
    [MemberData(nameof(Contexts))]
    public void Context_Should_NotDependOnOtherContexts_When_Compiled(string context)
    {
        var others = Contexts().Select(row => (string)row.Data).Where(c => c != context);
        var otherContextsPattern = $@"^AcroFunJam\.\w+(\.\w+)*\.({string.Join('|', others)})(\.|$)";

        Types().That().ResideInNamespaceMatching($@"^AcroFunJam\.\w+(\.\w+)*\.{context}(\.|$)")
            .Should().NotDependOnAny(Types().That().ResideInNamespaceMatching(otherContextsPattern))
            .Because("bounded contexts only share AcroFunJam.*.Common")
            .WithoutRequiringPositiveResults()
            .Check(Layers.Architecture);
    }
}
