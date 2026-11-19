using AcroFunJam.Application.Catalog;
using AcroFunJam.Application.Catalog.AddTag;
using AcroFunJam.Application.Catalog.SeedInitialTagList;
using AcroFunJam.Application.Common;
using AcroFunJam.Domain.Catalog;
using AcroFunJam.Domain.SharedKernel;
using AcroFunJam.Specs.Support.Identity;
using Microsoft.Extensions.DependencyInjection;

namespace AcroFunJam.Specs.Support.Catalog;

/// <summary>
/// Puts tags in the list for a "Soit" step, through the AddTag command resolved from the application services (no HTTP,
/// no policy), as <see cref="RoleSetter"/> does for roles (ADR 0009).
/// </summary>
public sealed class TagListSetUp(Deployment deployment)
{
    /// <summary>Adds a tag, applying to the transitions unless stated otherwise (story 9a, ADR 0035).</summary>
    public async Task<TagId> Add(string name, string description, string appliesTo = "transitions")
    {
        using var scope = deployment.Current.Services.CreateScope();
        var handler = scope.ServiceProvider.GetRequiredService<ICommandHandler<AddTag, TagDto>>();
        var result = await handler.Handle(new AddTag(TagName.Create(name).Value!, TagDescription.Create(description).Value!, TagScopeCodes.FromCode(appliesTo).Value), CancellationToken.None);
        if (result.IsFailure) throw new InvalidOperationException($"Cannot add the tag {name}: {result.Error}.");
        return result.Value!.Id;
    }

    /// <summary>The list as seeded at the first deployment (ADR 0032): the seven tags of the acroyoga expert.</summary>
    public async Task Seed()
    {
        using var scope = deployment.Current.Services.CreateScope();
        var handler = scope.ServiceProvider.GetRequiredService<ICommandHandler<SeedInitialTagList, bool>>();
        (await handler.Handle(new SeedInitialTagList(), CancellationToken.None)).Value.ShouldBeTrue();
    }
}
