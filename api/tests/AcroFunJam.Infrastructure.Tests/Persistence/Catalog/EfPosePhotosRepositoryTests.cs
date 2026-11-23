using AcroFunJam.Domain.Catalog;
using AcroFunJam.Domain.SharedKernel;
using AcroFunJam.Infrastructure.Persistence;
using AcroFunJam.Infrastructure.Persistence.Catalog;
using Microsoft.EntityFrameworkCore;

namespace AcroFunJam.Infrastructure.Tests.Persistence.Catalog;

/// <summary>
/// Storage of the photos of the poses (story 10, ADR 0039): one row per pose with photos (its main photo), one row per photo;
/// a removed photo is deleted.
/// </summary>
[Trait("Category", "Integration")]
public sealed class EfPosePhotosRepositoryTests(PostgreSqlFixture database) : IClassFixture<PostgreSqlFixture>, IAsyncLifetime
{
    private static readonly DateTimeOffset Now = new(2026, 11, 21, 10, 0, 0, TimeSpan.Zero);
    private static readonly PhotoManagerId Bruno = new(Guid.Parse("0b000000-0000-0000-0000-000000000001"));
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    private readonly Pose _bird = EfPoseRepositoryTests.APublishedPose("Bird");

    public async ValueTask InitializeAsync()
    {
        await using var context = database.CreateDbContext();
        await context.Database.MigrateAsync(Ct);
        await context.Set<PhotoRecord>().ExecuteDeleteAsync(Ct);
        await context.Set<PosePhotosRecord>().ExecuteDeleteAsync(Ct);
        await context.Set<PoseRecord>().ExecuteDeleteAsync(Ct);
        var aggregates = new TrackedAggregates();
        new EfPoseRepository(context, aggregates).Add(_bird);
        (await UnitOfWorks.For(context, aggregates).SaveChanges(Ct)).IsSuccess.ShouldBeTrue();
    }

    public ValueTask DisposeAsync() => ValueTask.CompletedTask;

    private static PhotoId NewId() => new(Guid.NewGuid());

    private static void AddTo(PosePhotos photos, PhotoId id, string altText, int width = 1600, int height = 1200) =>
        photos.Add(id, PhotoFile.Accept(PhotoFormat.Jpeg, PhotoFileSize.Create(1).Value!, new PhotoDimensions(width, height)).Value!,
            AltText.Create(altText).Value!, PhotoCredit.Create("Léa Martin").Value!, new RightsConfirmation(Bruno, Now), Now).IsSuccess.ShouldBeTrue();

    /// <summary>Reads the stored photos of Bird in a new context (none when absent), changes them and saves them, as a use case does.</summary>
    private async Task<AcroFunJam.Domain.Common.Result<bool>> Change(Action<PosePhotos> change)
    {
        await using var context = database.CreateDbContext();
        var aggregates = new TrackedAggregates();
        var repository = new EfPosePhotosRepository(context, aggregates);
        var photos = await repository.GetFor(_bird.Id, Ct) ?? PosePhotos.For(_bird.Id);
        change(photos);
        repository.Save(photos);
        return await UnitOfWorks.For(context, aggregates).SaveChanges(Ct);
    }

    private async Task<PosePhotos?> Stored()
    {
        await using var context = database.CreateDbContext();
        return await new EfPosePhotosRepository(context, new TrackedAggregates()).GetFor(_bird.Id, Ct);
    }

    [Fact]
    public async Task GetFor_Should_FindNothing_When_ThePoseNeverHadAPhoto()
    {
        (await Stored()).ShouldBeNull();
    }

    [Fact]
    public async Task Save_Should_StoreThePhotosWithTheirRightsAndTheMainPhoto_When_TheyAreAdded()
    {
        var (first, second) = (NewId(), NewId());

        (await Change(p => { AddTo(p, first, "Bird vue de profil"); AddTo(p, second, "Bird vue de face", 900, 1200); })).IsSuccess.ShouldBeTrue();

        var stored = (await Stored()).ShouldNotBeNull();
        stored.MainPhotoId.ShouldBe(first);
        stored.InPresentationOrder().Select(p => (p.Id, p.AltText.Value, p.Credit.Value, p.Dimensions, p.Rights, p.AddedAt))
            .ShouldBe([
                (first, "Bird vue de profil", "Léa Martin", new PhotoDimensions(1600, 1200), new RightsConfirmation(Bruno, Now), Now),
                (second, "Bird vue de face", "Léa Martin", new PhotoDimensions(900, 1200), new RightsConfirmation(Bruno, Now), Now),
            ]);
    }

    [Fact]
    public async Task Save_Should_StoreTheChosenMainPhotoTheCorrectionAndTheRemoval_When_TheyAreSaved()
    {
        var (first, second, third) = (NewId(), NewId(), NewId());
        await Change(p => { AddTo(p, first, "Bird 1"); AddTo(p, second, "Bird 2"); AddTo(p, third, "Bird 3"); });

        (await Change(p =>
        {
            p.ChooseAsMain(third, Now);
            p.Correct(second, AltText.Create("Bird vue de face").Value!, PhotoCredit.Create("Hugo Bernard").Value!, Now);
            p.Remove(first, Now);
        })).IsSuccess.ShouldBeTrue();

        var stored = (await Stored()).ShouldNotBeNull();
        stored.MainPhotoId.ShouldBe(third);
        stored.InPresentationOrder().Select(p => (p.AltText.Value, p.Credit.Value)).ShouldBe([("Bird 3", "Léa Martin"), ("Bird vue de face", "Hugo Bernard")]);
        await using var context = database.CreateDbContext();
        (await context.Set<PhotoRecord>().AnyAsync(p => p.Id == first.Value, Ct)).ShouldBeFalse();
    }

    [Fact]
    public async Task Save_Should_LeaveNoMainPhoto_When_TheLastPhotoIsRemoved()
    {
        var only = NewId();
        await Change(p => AddTo(p, only, "Bird"));

        await Change(p => p.Remove(only, Now));

        var stored = (await Stored()).ShouldNotBeNull();
        stored.MainPhotoId.ShouldBeNull();
        stored.InPresentationOrder().ShouldBeEmpty();
    }

    [Fact]
    public async Task ExistsAndMainPhotosOf_Should_FindTheCurrentPhotosOnly_When_SomeHaveBeenRemoved()
    {
        var (kept, removed) = (NewId(), NewId());
        await Change(p => { AddTo(p, removed, "Bird 1"); AddTo(p, kept, "Bird 2"); });
        await Change(p => p.Remove(removed, Now));

        await using var context = database.CreateDbContext();
        var repository = new EfPosePhotosRepository(context, new TrackedAggregates());
        (await repository.Exists(kept, Ct)).ShouldBeTrue();
        (await repository.Exists(removed, Ct)).ShouldBeFalse();
        (await repository.MainPhotosOf([_bird.Id, new PoseId(Guid.NewGuid())], Ct)).ShouldBe(new Dictionary<PoseId, PhotoId> { [_bird.Id] = kept });
    }

    [Fact]
    public async Task Save_Should_SucceedFromAReadOfTheMoment_When_APhotoWasRemovedMeanwhileByAnotherSave()
    {
        var (removed, kept) = (NewId(), NewId());
        await Change(p => { AddTo(p, removed, "Bird 1"); AddTo(p, kept, "Bird 2"); });

        await using var context = database.CreateDbContext();
        var aggregates = new TrackedAggregates();
        var repository = new EfPosePhotosRepository(context, aggregates);
        // A first read, outside the lock (the pre-check of the maximum), sees both photos...
        (await repository.GetFor(_bird.Id, Ct)).ShouldNotBeNull();
        // ...another validator removes one meanwhile...
        await Change(p => p.Remove(removed, Now));
        // ...and the read under the lock no longer has it: saving must not delete it again.
        var photos = (await repository.GetFor(_bird.Id, Ct)).ShouldNotBeNull();
        AddTo(photos, NewId(), "Bird 3");
        repository.Save(photos);

        (await UnitOfWorks.For(context, aggregates).SaveChanges(Ct)).IsSuccess.ShouldBeTrue();
        (await Stored()).ShouldNotBeNull().InPresentationOrder().Select(p => p.AltText.Value).ShouldBe(["Bird 2", "Bird 3"]);
    }
}
