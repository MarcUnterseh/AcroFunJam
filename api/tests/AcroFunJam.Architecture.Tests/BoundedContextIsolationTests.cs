using ArchUnitNET.xUnitV3;
using static ArchUnitNET.Fluent.ArchRuleDefinition;

namespace AcroFunJam.Architecture.Tests;

/// <summary>
/// A bounded context never references the types of another one (ddd-patterns skill):
/// it goes through identifiers, integration events or an anti-corruption layer.
/// Only <c>Common</c> and the shared kernel of Catalog and Contribution (<c>SharedKernel</c>, ADR 0015) are shared.
/// </summary>
public sealed class BoundedContextIsolationTests
{
    // Keep in sync with docs/domain/context-map.md.
    public static TheoryData<string> Contexts() => ["Catalog", "FlowGeneration", "Repertoire", "Contribution", "Identity"];

    private static IEnumerable<string> AllContexts() => Contexts().Select(row => (string)row.Data);

    private static string NamespacesOf(IEnumerable<string> contexts) =>
        $@"^AcroFunJam\.\w+(\.\w+)*\.({string.Join('|', contexts)})(\.|$)";

    [Theory]
    [MemberData(nameof(Contexts))]
    public void Context_Should_NotDependOnOtherContexts_When_Compiled(string context)
    {
        var others = AllContexts().Where(c => c != context);

        Types().That().ResideInNamespaceMatching($@"^AcroFunJam\.\w+(\.\w+)*\.{context}(\.|$)")
            .Should().NotDependOnAny(Types().That().ResideInNamespaceMatching(NamespacesOf(others)))
            .Because("bounded contexts only share AcroFunJam.*.Common and AcroFunJam.Domain.SharedKernel")
            .WithoutRequiringPositiveResults()
            .Check(Layers.Architecture);
    }

    [Fact]
    public void SharedKernel_Should_NotDependOnAnyContext_When_Compiled()
    {
        Types().That().ResideInNamespaceMatching(@"^AcroFunJam\.Domain\.SharedKernel(\.|$)")
            .Should().NotDependOnAny(Types().That().ResideInNamespaceMatching(NamespacesOf(AllContexts())))
            .Because("the shared kernel is the common ground of Catalog and Contribution, owned by neither (ADR 0015)")
            .Check(Layers.Architecture);
    }
}
