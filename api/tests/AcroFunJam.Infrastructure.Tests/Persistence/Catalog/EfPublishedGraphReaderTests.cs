using AcroFunJam.Application.Catalog.GetPublishedGraph;
using AcroFunJam.Application.Catalog.GetTagNames;
using AcroFunJam.Domain.Catalog;
using AcroFunJam.Domain.SharedKernel;
using AcroFunJam.Infrastructure.Persistence;
using AcroFunJam.Infrastructure.Persistence.Catalog;
using Microsoft.EntityFrameworkCore;

namespace AcroFunJam.Infrastructure.Tests.Persistence.Catalog;

/// <summary>Reading the published graph for the generation of flows (story 9, ADR 0037).</summary>
[Trait("Category", "Integration")]
public sealed class EfPublishedGraphReaderTests(PostgreSqlFixture database) : IClassFixture<PostgreSqlFixture>
{
    private static readonly DateTimeOffset Now = new(2026, 11, 19, 10, 0, 0, TimeSpan.Zero);
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    [Fact]
    public async Task Read_Should_GiveThePublishedPosesAndTransitionsWithTheirTags_When_TheCatalogHasSome()
    {
        var lunar = new TagId(Guid.NewGuid());
        var pop = new TagId(Guid.NewGuid());
        var throne = EfPoseRepositoryTests.APublishedPose("Throne");
        var leaf = Pose.Publish(new PoseId(Guid.NewGuid()), PoseName.Create("Folded Leaf").Value!,
            Difficulty.Create(DifficultyLevel.Beginner, DifficultyLevel.Discovery).Value!, FlowBoundaries.Create(false, true).Value!, null,
            nameAlreadyPublished: false, Now, new TagChoice(TagSet.Of([lunar]), TagSet.Empty)).Value!;
        var named = Transition.Publish(
            new TransitionId(Guid.NewGuid()), throne.Id, leaf.Id, TransitionName.CreateOptional("Pop to Leaf").Value,
            Difficulty.Create(DifficultyLevel.Beginner, DifficultyLevel.Intermediate).Value!, TransitionDescription.CreateOptional("Un élan.").Value,
            new TagChoice(TagSet.Of([pop]), TagSet.Empty), source: null, fromPosePublished: true, toPosePublished: true, slotTaken: false, Now).Value!;
        var unnamed = Transition.Publish(
            new TransitionId(Guid.NewGuid()), leaf.Id, leaf.Id, null, Difficulty.Create(DifficultyLevel.Advanced, DifficultyLevel.Advanced).Value!,
            null, new TagChoice(TagSet.Empty, TagSet.Empty), source: null, fromPosePublished: true, toPosePublished: true, slotTaken: false, Now).Value!;
        var list = TagList.Empty();
        var listed = list.Add(new TagId(Guid.NewGuid()), TagName.Create("lunaire").Value!, TagDescription.Create("La lune.").Value!, TagScope.Poses, Now).Value!;
        var removed = list.Add(new TagId(Guid.NewGuid()), TagName.Create("ancienne").Value!, TagDescription.Create("Retirée.").Value!, TagScope.Poses, Now).Value!;
        list.Remove(removed.Id, Now);
        await using (var context = database.CreateDbContext())
        {
            await context.Database.MigrateAsync(Ct);
            await context.Set<TagRecord>().ExecuteDeleteAsync(Ct);
            await context.Set<TagListRecord>().ExecuteDeleteAsync(Ct);
            var tagLists = new TrackedAggregates();
            new EfTagListRepository(context, tagLists).Add(list);
            (await UnitOfWorks.For(context, tagLists).SaveChanges(Ct)).IsSuccess.ShouldBeTrue();
        }

        await using (var context = database.CreateDbContext())
        {
            await context.Set<TransitionRecord>().ExecuteDeleteAsync(Ct);
            await context.Set<PoseRecord>().ExecuteDeleteAsync(Ct);
            var aggregates = new TrackedAggregates();
            var poses = new EfPoseRepository(context, aggregates);
            poses.Add(throne);
            poses.Add(leaf);
            (await UnitOfWorks.For(context, aggregates).SaveChanges(Ct)).IsSuccess.ShouldBeTrue();
        }

        await using (var context = database.CreateDbContext())
        {
            var aggregates = new TrackedAggregates();
            var transitions = new EfTransitionRepository(context, aggregates);
            transitions.Add(named);
            transitions.Add(unnamed);
            (await UnitOfWorks.For(context, aggregates).SaveChanges(Ct)).IsSuccess.ShouldBeTrue();
        }

        await using var readContext = database.CreateDbContext();
        var graph = await new EfPublishedGraphReader(readContext).Read(Ct);

        graph.Poses.Select(p => (p.Id, p.Name.Value, p.Flow, p.Tags)).ShouldBe(
            [(throne.Id, "Throne", throne.Flow, TagSet.Empty), (leaf.Id, "Folded Leaf", leaf.Flow, TagSet.Of([lunar]))], ignoreOrder: true);
        graph.Transitions.ShouldBe(
            [
                new PublishedTransitionSummary(named.Id, throne.Id, leaf.Id, named.Name, named.Difficulty, named.Description, TagSet.Of([pop])),
                new PublishedTransitionSummary(unnamed.Id, leaf.Id, leaf.Id, null, unnamed.Difficulty, null, TagSet.Empty),
            ],
            ignoreOrder: true);
        graph.TagsOfTheList.ShouldBe([new NamedTag(listed.Id, listed.Name)]);
    }
}
