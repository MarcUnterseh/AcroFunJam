using AcroFunJam.Domain.Catalog;
using AcroFunJam.Domain.SharedKernel;
using AcroFunJam.Infrastructure.Persistence;
using AcroFunJam.Infrastructure.Persistence.Catalog;
using Microsoft.EntityFrameworkCore;

namespace AcroFunJam.Infrastructure.Tests.Persistence.Catalog;

/// <summary>Storage of the list of tags (story 8, ADR 0032): one row for the list, one per tag, removed ones included.</summary>
[Trait("Category", "Integration")]
public sealed class EfTagListRepositoryTests(PostgreSqlFixture database) : IClassFixture<PostgreSqlFixture>, IAsyncLifetime
{
    private static readonly DateTimeOffset Now = new(2026, 11, 16, 10, 0, 0, TimeSpan.Zero);
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    public async ValueTask InitializeAsync()
    {
        await using var context = database.CreateDbContext();
        await context.Database.MigrateAsync(Ct);
        await context.Set<TagRecord>().ExecuteDeleteAsync(Ct);
        await context.Set<TagListRecord>().ExecuteDeleteAsync(Ct);
    }

    public ValueTask DisposeAsync() => ValueTask.CompletedTask;

    private static TagName Name(string name) => TagName.Create(name).Value!;

    private static TagDescription Description(string description) => TagDescription.Create(description).Value!;

    private static TagId NewId() => new(Guid.NewGuid());

    /// <summary>Reads the stored list in a new context, changes it and saves it, as a use case does.</summary>
    private async Task<AcroFunJam.Domain.Common.Result<bool>> Change(Action<TagList> change)
    {
        await using var context = database.CreateDbContext();
        var aggregates = new TrackedAggregates();
        var repository = new EfTagListRepository(context, aggregates);
        var list = (await repository.Get(Ct)).ShouldNotBeNull();
        change(list);
        repository.Update(list);
        return await UnitOfWorks.For(context, aggregates).SaveChanges(Ct);
    }

    private async Task<AcroFunJam.Domain.Common.Result<bool>> Store(TagList list)
    {
        await using var context = database.CreateDbContext();
        var aggregates = new TrackedAggregates();
        new EfTagListRepository(context, aggregates).Add(list);
        return await UnitOfWorks.For(context, aggregates).SaveChanges(Ct);
    }

    private async Task<TagList?> Stored()
    {
        await using var context = database.CreateDbContext();
        return await new EfTagListRepository(context, new TrackedAggregates()).Get(Ct);
    }

    [Fact]
    public async Task Get_Should_FindNoList_When_NoneHasBeenStored()
    {
        (await Stored()).ShouldBeNull();
    }

    [Fact]
    public async Task Add_Should_StoreTheSeededListWithItsImplications_When_Saved()
    {
        var seeded = TagList.Seed(InitialTagList.Current, NewId, Now);

        (await Store(seeded)).IsSuccess.ShouldBeTrue();
        seeded.DomainEvents.ShouldBeEmpty();

        var stored = (await Stored()).ShouldNotBeNull();
        stored.SeededAt.ShouldBe(Now);
        stored.SeedRevision.ShouldBe(InitialTagList.Current.Number);
        stored.Tags.Select(t => (t.Id, t.Name, t.Description, t.ImpliedTag, t.Scope))
            .ShouldBe(seeded.Tags.Select(t => (t.Id, t.Name, t.Description, t.ImpliedTag, t.Scope)));
    }

    [Fact]
    public async Task Update_Should_StoreTheAddedRenamedDescribedAndRemovedTags_When_Saved()
    {
        var pop = NewId();
        var lunaire = NewId();
        var vrille = NewId();
        var list = TagList.Empty();
        list.Add(pop, Name("pop"), Description("Le flyer décolle."), TagScope.Transitions, Now);
        list.Add(lunaire, Name("lunnaire"), Description("Pratique thérapeutique."), TagScope.Transitions, Now);
        (await Store(list)).IsSuccess.ShouldBeTrue();

        (await Change(l =>
        {
            l.Add(vrille, Name("vrille"), Description("Le flyer tourne sur lui-même."), TagScope.Transitions, Now);
            l.Rename(lunaire, Name("lunaire"), Now);
            l.Describe(pop, Description("La base propulse le flyer."), Now);
        })).IsSuccess.ShouldBeTrue();
        (await Change(l => l.Remove(vrille, Now))).IsSuccess.ShouldBeTrue();

        var stored = (await Stored()).ShouldNotBeNull();
        stored.SeededAt.ShouldBeNull();
        stored.Tags.Select(t => (t.Name.Value, t.Description.Value))
            .ShouldBe([("lunaire", "Pratique thérapeutique."), ("pop", "La base propulse le flyer.")]);
        stored.AllTags.Single(t => t.Id == vrille).RemovedAt.ShouldBe(Now);
    }

    [Fact]
    public async Task Update_Should_FailWithTagNameTaken_When_AConcurrentAddTookTheName()
    {
        (await Store(TagList.Empty())).IsSuccess.ShouldBeTrue();

        // Both read the list without "pop"; the second save meets the unique index of the names.
        await using var first = database.CreateDbContext();
        await using var second = database.CreateDbContext();
        var firstAggregates = new TrackedAggregates();
        var secondAggregates = new TrackedAggregates();
        var firstRepository = new EfTagListRepository(first, firstAggregates);
        var secondRepository = new EfTagListRepository(second, secondAggregates);
        var firstList = (await firstRepository.Get(Ct))!;
        var secondList = (await secondRepository.Get(Ct))!;
        firstList.Add(NewId(), Name("pop"), Description("D."), TagScope.Transitions, Now);
        secondList.Add(NewId(), Name("POP"), Description("D."), TagScope.Transitions, Now);
        firstRepository.Update(firstList);
        secondRepository.Update(secondList);

        (await UnitOfWorks.For(first, firstAggregates).SaveChanges(Ct)).IsSuccess.ShouldBeTrue();
        (await UnitOfWorks.For(second, secondAggregates).SaveChanges(Ct)).Error.ShouldBe(CatalogErrors.TagNameTaken);
    }

    [Fact]
    public async Task Update_Should_AcceptTheNameOfARemovedTag_When_ANewTagTakesIt()
    {
        var vrille = NewId();
        var list = TagList.Empty();
        list.Add(vrille, Name("vrille"), Description("D."), TagScope.Transitions, Now);
        (await Store(list)).IsSuccess.ShouldBeTrue();
        (await Change(l => l.Remove(vrille, Now))).IsSuccess.ShouldBeTrue();

        (await Change(l => l.Add(NewId(), Name("vrille"), Description("D."), TagScope.Transitions, Now))).IsSuccess.ShouldBeTrue();

        (await Stored())!.AllTags.Count.ShouldBe(2);
    }

    [Fact]
    public async Task Update_Should_StoreTheScopesAndTheRevision_When_TheListIsUpgraded()
    {
        (await Store(TagList.Seed(InitialTagList.Revision(1), NewId, Now))).IsSuccess.ShouldBeTrue();

        (await Change(l => l.Upgrade(InitialTagList.Current, Now))).IsSuccess.ShouldBeTrue();

        var stored = (await Stored()).ShouldNotBeNull();
        stored.SeedRevision.ShouldBe(InitialTagList.Current.Number);
        stored.Tags.Single(t => t.Name.Value == "lunaire").Scope.ShouldBe(TagScope.PosesAndTransitions);
        stored.Tags.Single(t => t.Name.Value == "lunaire").Description
            .ShouldBe(InitialTagList.Current.Tags.Single(t => t.Name.Value == "lunaire").Description);
    }

    [Fact]
    public async Task Update_Should_StoreAChangedScope_When_Saved()
    {
        var vrille = NewId();
        var list = TagList.Empty();
        list.Add(vrille, Name("vrille"), Description("D."), TagScope.Transitions, Now);
        (await Store(list)).IsSuccess.ShouldBeTrue();

        (await Change(l => l.ChangeScope(vrille, TagScope.Poses, TagCarriers.None, Now))).IsSuccess.ShouldBeTrue();

        (await Stored())!.Tags.Single().Scope.ShouldBe(TagScope.Poses);
    }
}
