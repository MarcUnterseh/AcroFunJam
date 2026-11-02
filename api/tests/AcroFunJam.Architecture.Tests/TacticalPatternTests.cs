using System.Reflection;
using AcroFunJam.Domain.Common;

namespace AcroFunJam.Architecture.Tests;

/// <summary>Structural rules of the DDD tactical patterns (ddd-patterns and clean-architecture skills).</summary>
public sealed class TacticalPatternTests
{
    private static IEnumerable<Type> Aggregates() =>
        Layers.ConcreteTypes(Layers.DomainAssembly).Where(IsAggregateRoot);

    private static bool IsAggregateRoot(Type type)
    {
        for (var t = type.BaseType; t is not null; t = t.BaseType)
        {
            if (t.IsGenericType && t.GetGenericTypeDefinition() == typeof(AggregateRoot<>)) return true;
        }
        return false;
    }

    private static IEnumerable<Type> Handlers(Assembly assembly) =>
        Layers.ConcreteTypes(assembly).Where(t => t.Name.EndsWith("Handler", StringComparison.Ordinal));

    [Fact]
    public void Aggregates_Should_BeSealed_When_DeclaredInTheDomain()
    {
        Aggregates().Where(t => !t.IsSealed).Select(t => t.FullName).ShouldBeEmpty();
    }

    [Fact]
    public void Aggregates_Should_NotExposePublicSetters_When_DeclaredInTheDomain()
    {
        Aggregates()
            .SelectMany(t => t.GetProperties(BindingFlags.Instance | BindingFlags.Public))
            .Where(p => p.SetMethod is { IsPublic: true })
            .Select(p => $"{p.DeclaringType?.Name}.{p.Name}")
            .ShouldBeEmpty();
    }

    [Fact]
    public void Handlers_Should_BeInternalAndSealed_When_DeclaredInTheApplication()
    {
        Handlers(Layers.ApplicationAssembly)
            .Where(t => t.IsPublic || t.IsNestedPublic || !t.IsSealed)
            .Select(t => t.FullName)
            .ShouldBeEmpty();
    }

    [Theory]
    [MemberData(nameof(NonApplicationAssemblies))]
    public void Handlers_Should_OnlyLiveInTheApplication_When_Compiled(string assemblyName)
    {
        var assembly = Assembly.Load(assemblyName);

        Handlers(assembly)
            .Where(t => t.GetInterfaces().Any(i => i.IsGenericType &&
                i.GetGenericTypeDefinition().Namespace == "AcroFunJam.Application.Common"))
            .Select(t => t.FullName)
            .ShouldBeEmpty();
    }

    [Fact]
    public void DomainEvents_Should_BeSealedRecordsNamedInThePastTense_When_DeclaredInTheDomain()
    {
        Layers.ConcreteTypes(Layers.DomainAssembly)
            .Where(t => typeof(IDomainEvent).IsAssignableFrom(t))
            .Where(t => !t.IsSealed || t.GetMethod("<Clone>$") is null || !t.Name.EndsWith("ed", StringComparison.Ordinal))
            .Select(t => t.FullName)
            .ShouldBeEmpty();
    }

    [Fact]
    public void DomainTypes_Should_NotExposePublicSetters_When_TheyAreNotAggregates()
    {
        Layers.DomainAssembly.GetTypes()
            .Where(t => t.IsPublic && !IsAggregateRoot(t))
            .SelectMany(t => t.GetProperties(BindingFlags.Instance | BindingFlags.Public | BindingFlags.DeclaredOnly))
            .Where(p => p.SetMethod is { IsPublic: true } setter && !IsInitOnly(setter))
            .Select(p => $"{p.DeclaringType?.Name}.{p.Name}")
            .ShouldBeEmpty();
    }

    private static bool IsInitOnly(MethodInfo setter) =>
        setter.ReturnParameter.GetRequiredCustomModifiers().Any(m => m.FullName == "System.Runtime.CompilerServices.IsExternalInit");

    public static TheoryData<string> NonApplicationAssemblies() =>
    [
        Layers.DomainAssembly.GetName().Name!,
        Layers.InfrastructureAssembly.GetName().Name!,
        Layers.ApiAssembly.GetName().Name!,
    ];
}
