using AcroFunJam.Api.Authorization;
using AcroFunJam.Api.Endpoints.Common;
using AcroFunJam.Application.Catalog;
using AcroFunJam.Application.Catalog.AddTag;
using AcroFunJam.Application.Catalog.ChangeTag;
using AcroFunJam.Application.Catalog.ListTags;
using AcroFunJam.Application.Catalog.RemoveTag;
using AcroFunJam.Application.Catalog.GetTagNames;
using AcroFunJam.Application.Catalog.TagTransition;
using AcroFunJam.Application.Common;
using AcroFunJam.Domain.Catalog;
using AcroFunJam.Domain.Common;
using AcroFunJam.Domain.SharedKernel;
using Microsoft.AspNetCore.Http.HttpResults;

namespace AcroFunJam.Api.Endpoints.Catalog;

/// <summary>The list of tags: consulted by anybody, managed by the validators and the administrators (story 8, ADR 0034).</summary>
internal static class TagEndpoints
{
    public static RouteGroupBuilder MapTagEndpoints(this RouteGroupBuilder catalog)
    {
        catalog.MapGet("/tags", ListTags)
            .WithName("ListTags")
            .AllowAnonymous();

        catalog.MapPost("/tags", AddTag)
            .WithName("AddTag")
            .RequireAuthorization(Capabilities.CanManageTags)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status403Forbidden)
            .ProducesProblem(StatusCodes.Status409Conflict);

        catalog.MapPut("/tags/{id:guid}", ChangeTag)
            .WithName("ChangeTag")
            .RequireAuthorization(Capabilities.CanManageTags)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status403Forbidden)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status409Conflict);

        catalog.MapDelete("/tags/{id:guid}", RemoveTag)
            .WithName("RemoveTag")
            .RequireAuthorization(Capabilities.CanManageTags)
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status403Forbidden)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status409Conflict);

        catalog.MapPut("/transitions/{id:guid}/tags", TagTransition)
            .WithName("TagTransition")
            .RequireAuthorization(Capabilities.CanManageTags)
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status403Forbidden)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status409Conflict);

        return catalog;
    }

    /// <summary>
    /// A validator replaces the tags of a published transition (story 8, P2): an empty list removes them all, duplicates are
    /// ignored; the answer gives the set completed through the list, in catalog order (ADR 0034).
    /// </summary>
    private static async Task<Results<Ok<TaggedTransitionResponse>, ProblemHttpResult>> TagTransition(
        Guid id,
        TagTransitionRequest request,
        ICommandHandler<TagTransition, TagSet> handler,
        IQueryHandler<GetTagNames, IReadOnlyList<NamedTag>> names,
        CancellationToken ct)
    {
        var tagged = await handler.Handle(new TagTransition(new TransitionId(id), [.. (request.TagIds ?? []).Select(t => new TagId(t))]), ct);
        if (tagged.IsFailure) return tagged.Error!.ToProblem();

        var named = await names.Handle(new GetTagNames(tagged.Value!), ct);
        return TypedResults.Ok(new TaggedTransitionResponse(id, [.. named.Value!.Select(t => new NamedTagResponse(t.Id.Value, t.Name.Value))]));
    }

    private static async Task<Results<Ok<TagListResponse>, ProblemHttpResult>> ListTags(
        IQueryHandler<ListTags, IReadOnlyList<TagDto>> handler, CancellationToken ct)
    {
        var result = await handler.Handle(new ListTags(), ct);
        if (result.IsFailure) return result.Error!.ToProblem();
        return TypedResults.Ok(new TagListResponse([.. result.Value!.Select(ToResponse)]));
    }

    /// <summary>The name is checked first, then the description, in the order of the form.</summary>
    private static async Task<Results<Created<TagResponse>, ProblemHttpResult>> AddTag(
        TagRequest request, ICommandHandler<AddTag, TagDto> handler, CancellationToken ct)
    {
        var content = TagContent(request);
        if (content.IsFailure) return content.Error!.ToProblem();

        var result = await handler.Handle(new AddTag(content.Value.Name, content.Value.Description), ct);
        if (result.IsFailure) return result.Error!.ToProblem();
        // No Location header: a tag is read back with the list (ADR 0034).
        return TypedResults.Created((string?)null, ToResponse(result.Value!));
    }

    /// <summary>Both the name and the description are given; the site sends back the unchanged one (ADR 0034).</summary>
    private static async Task<Results<Ok<TagResponse>, ProblemHttpResult>> ChangeTag(
        Guid id, TagRequest request, ICommandHandler<ChangeTag, TagDto> handler, CancellationToken ct)
    {
        var content = TagContent(request);
        if (content.IsFailure) return content.Error!.ToProblem();

        var result = await handler.Handle(new ChangeTag(new TagId(id), content.Value.Name, content.Value.Description), ct);
        if (result.IsFailure) return result.Error!.ToProblem();
        return TypedResults.Ok(ToResponse(result.Value!));
    }

    /// <summary>A tag still implied by another one is refused with the tags implying it (<c>impliedBy</c>, ADR 0034).</summary>
    private static async Task<Results<NoContent, ProblemHttpResult>> RemoveTag(
        Guid id, ICommandHandler<RemoveTag, bool> handler, IQueryHandler<ListTags, IReadOnlyList<TagDto>> list, CancellationToken ct)
    {
        var tag = new TagId(id);
        var result = await handler.Handle(new RemoveTag(tag), ct);
        if (result.Error == CatalogErrors.TagImplied)
        {
            var tags = (await list.Handle(new ListTags(), ct)).Value ?? [];
            var impliedBy = tags.Where(t => t.ImpliedTag == tag).Select(t => new NamedTagResponse(t.Id.Value, t.Name.Value)).ToList();
            return result.Error.ToProblem(new Dictionary<string, object?> { ["impliedBy"] = impliedBy });
        }

        if (result.IsFailure) return result.Error!.ToProblem();
        return TypedResults.NoContent();
    }

    private static Result<(TagName Name, TagDescription Description)> TagContent(TagRequest request)
    {
        var name = TagName.Create(request.Name);
        if (name.IsFailure) return name.Error!;
        var description = TagDescription.Create(request.Description);
        if (description.IsFailure) return description.Error!;
        return Result<(TagName, TagDescription)>.Success((name.Value!, description.Value!));
    }

    private static TagResponse ToResponse(TagDto tag) =>
        new(tag.Id.Value, tag.Name.Value, tag.Description.Value, tag.ImpliedTag?.Value, tag.TransitionCount);
}

/// <summary>A tag to add, or the new name and description of a tag.</summary>
public sealed record TagRequest(string? Name, string? Description);

/// <summary>The list of tags, in catalog order.</summary>
public sealed record TagListResponse(IReadOnlyList<TagResponse> Tags);

/// <summary>
/// A tag of the list: <c>impliedTagId</c> is the tag it adds when chosen (« dynamique » for « pop »); <c>transitionCount</c>
/// the published transitions carrying it.
/// </summary>
public sealed record TagResponse(Guid Id, string Name, string Description, Guid? ImpliedTagId, int TransitionCount);

/// <summary>A tag designated by its identifier and its current name.</summary>
public sealed record NamedTagResponse(Guid Id, string Name);

/// <summary>The tags chosen for a published transition, by identifier (ADR 0034).</summary>
public sealed record TagTransitionRequest(IReadOnlyList<Guid>? TagIds);

/// <summary>A published transition and its tags, completed through the list, in catalog order.</summary>
public sealed record TaggedTransitionResponse(Guid Id, IReadOnlyList<NamedTagResponse> Tags);
