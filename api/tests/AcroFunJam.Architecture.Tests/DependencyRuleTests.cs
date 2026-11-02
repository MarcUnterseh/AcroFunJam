using ArchUnitNET.xUnitV3;
using static ArchUnitNET.Fluent.ArchRuleDefinition;

namespace AcroFunJam.Architecture.Tests;

/// <summary>Dependencies point towards the domain (clean-architecture skill, ADR 0002).</summary>
public sealed class DependencyRuleTests
{
    private static readonly string[] FrameworksForbiddenInDomain =
    [
        "Microsoft.EntityFrameworkCore",
        "Microsoft.AspNetCore",
        "Microsoft.Extensions.DependencyInjection",
        "System.Text.Json",
        "Newtonsoft.Json",
    ];

    [Fact]
    public void Domain_Should_NotDependOnOtherLayers_When_Compiled()
    {
        Types().That().Are(Layers.Domain)
            .Should().NotDependOnAny(Layers.Application)
            .AndShould().NotDependOnAny(Layers.Infrastructure)
            .AndShould().NotDependOnAny(Layers.Api)
            .Because("the domain is the core of the clean architecture")
            .Check(Layers.Architecture);
    }

    [Fact]
    public void Domain_Should_NotReferenceTechnicalFrameworks_When_Compiled()
    {
        var referenced = Layers.DomainAssembly.GetReferencedAssemblies().Select(a => a.Name ?? string.Empty);

        referenced
            .Where(name => FrameworksForbiddenInDomain.Any(f => name.StartsWith(f, StringComparison.Ordinal)) ||
                           name.StartsWith("AcroFunJam.", StringComparison.Ordinal))
            .ShouldBeEmpty();
    }

    [Fact]
    public void Application_Should_NotDependOnInfrastructureOrApi_When_Compiled()
    {
        Types().That().Are(Layers.Application)
            .Should().NotDependOnAny(Layers.Infrastructure)
            .AndShould().NotDependOnAny(Layers.Api)
            .Because("use cases only know ports, adapters are plugged in by the composition root")
            .Check(Layers.Architecture);
    }

    [Fact]
    public void Application_Should_NotReferenceEntityFrameworkOrAspNetCore_When_Compiled()
    {
        Layers.ApplicationAssembly.GetReferencedAssemblies()
            .Select(a => a.Name ?? string.Empty)
            .Where(n => n.StartsWith("Microsoft.EntityFrameworkCore", StringComparison.Ordinal) ||
                        n.StartsWith("Microsoft.AspNetCore", StringComparison.Ordinal))
            .ShouldBeEmpty();
    }

    [Fact]
    public void Infrastructure_Should_NotDependOnApi_When_Compiled()
    {
        Types().That().Are(Layers.Infrastructure)
            .Should().NotDependOnAny(Layers.Api)
            .Check(Layers.Architecture);
    }
}
