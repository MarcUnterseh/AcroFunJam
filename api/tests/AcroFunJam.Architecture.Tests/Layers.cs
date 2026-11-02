using System.Reflection;
using AcroFunJam.Domain.Common;
using ArchUnitNET.Domain;
using Assembly = System.Reflection.Assembly;
using Type = System.Type;
using ArchUnitNET.Loader;
using static ArchUnitNET.Fluent.ArchRuleDefinition;

namespace AcroFunJam.Architecture.Tests;

/// <summary>The analysed assemblies and the layers of the clean architecture.</summary>
internal static class Layers
{
    public static readonly Assembly DomainAssembly = typeof(Entity<>).Assembly;
    public static readonly Assembly ApplicationAssembly = typeof(AcroFunJam.Application.DependencyInjection).Assembly;
    public static readonly Assembly InfrastructureAssembly = typeof(AcroFunJam.Infrastructure.DependencyInjection).Assembly;
    public static readonly Assembly ApiAssembly = typeof(Program).Assembly;

    public static readonly ArchUnitNET.Domain.Architecture Architecture = new ArchLoader()
        .LoadAssemblies(DomainAssembly, ApplicationAssembly, InfrastructureAssembly, ApiAssembly)
        .Build();

    public static readonly IObjectProvider<IType> Domain =
        Types().That().ResideInAssembly(DomainAssembly).As("Domain");

    public static readonly IObjectProvider<IType> Application =
        Types().That().ResideInAssembly(ApplicationAssembly).As("Application");

    public static readonly IObjectProvider<IType> Infrastructure =
        Types().That().ResideInAssembly(InfrastructureAssembly).As("Infrastructure");

    public static readonly IObjectProvider<IType> Api =
        Types().That().ResideInAssembly(ApiAssembly).As("Api");

    /// <summary>Concrete types of an assembly, compiler-generated ones excluded.</summary>
    public static IEnumerable<Type> ConcreteTypes(Assembly assembly) =>
        assembly.GetTypes().Where(t => t.IsClass && !t.IsAbstract && !t.Name.Contains('<', StringComparison.Ordinal));
}
