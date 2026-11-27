using AcroFunJam.Application.Catalog;
using AcroFunJam.Domain.Catalog;
using AcroFunJam.Domain.SharedKernel;
using AcroFunJam.Infrastructure.ContextIntegration;
using AcroFunJam.Infrastructure.Persistence;
using AcroFunJam.Infrastructure.Persistence.Catalog;
using Microsoft.EntityFrameworkCore;

namespace AcroFunJam.Infrastructure.Tests.Persistence.Catalog;

/// <summary>
/// Storage of the videos of the transitions and of their preparation jobs (story 12, ADR 0041): one row per video in
/// catalog.videos; a removed video is deleted, and its job with it; a job is claimed by lease, never twice at the same time.
/// </summary>
[Trait("Category", "Integration")]
public sealed class EfTransitionVideosRepositoryTests(PostgreSqlFixture database) : IClassFixture<PostgreSqlFixture>, IAsyncLifetime
{
    private static readonly DateTimeOffset Now = new(2026, 12, 1, 10, 0, 0, TimeSpan.Zero);
    private static readonly CatalogManagerId Bruno = new(Guid.Parse("0b000000-0000-0000-0000-000000000001"));
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    private readonly Pose _throne = EfPoseRepositoryTests.APublishedPose("Throne");
    private readonly Pose _bird = EfPoseRepositoryTests.APublishedPose("Bird");
    private Transition _popToBird = null!;

    public async ValueTask InitializeAsync()
    {
        await using var context = database.CreateDbContext();
        await context.Database.MigrateAsync(Ct);
        await context.Set<VideoPreparationJobRecord>().ExecuteDeleteAsync(Ct);
        await context.Set<VideoRecord>().ExecuteDeleteAsync(Ct);
        await context.Set<TransitionRecord>().ExecuteDeleteAsync(Ct);
        await context.Set<PoseRecord>().ExecuteDeleteAsync(Ct);
        var aggregates = new TrackedAggregates();
        var poses = new EfPoseRepository(context, aggregates);
        poses.Add(_throne);
        poses.Add(_bird);
        _popToBird = Transition.Publish(
            new TransitionId(Guid.NewGuid()), _throne.Id, _bird.Id, TransitionName.CreateOptional("Pop to Bird").Value,
            Difficulty.Create(DifficultyLevel.Intermediate, DifficultyLevel.Intermediate).Value!, null, new TagChoice(TagSet.Empty, TagSet.Empty),
            source: null, fromPosePublished: true, toPosePublished: true, slotTaken: false, Now).Value!;
        new EfTransitionRepository(context, aggregates).Add(_popToBird);
        (await UnitOfWorks.For(context, aggregates).SaveChanges(Ct)).IsSuccess.ShouldBeTrue();
    }

    public ValueTask DisposeAsync() => ValueTask.CompletedTask;

    private static VideoId NewId() => new(Guid.CreateVersion7());

    private static void AddTo(TransitionVideos videos, VideoId id, string caption, string? description = null) =>
        videos.Add(id, VideoFile.Accept(VideoFormat.QuickTime, VideoFileSize.Create(1).Value!, new VideoDimensions(1080, 1920),
                VideoDuration.FromMilliseconds(12_345)).Value!,
            VideoCaption.Create(caption).Value!, VideoCredit.Create("Léa Martin").Value!, VideoDescription.Create(description).Value,
            new RightsConfirmation(Bruno, Now), Now).IsSuccess.ShouldBeTrue();

    /// <summary>Reads the stored videos of Pop to Bird in a new context, changes them and saves them, as a use case does.</summary>
    private async Task<AcroFunJam.Domain.Common.Result<bool>> Change(Action<TransitionVideos, PgVideoPreparationQueue> change)
    {
        await using var context = database.CreateDbContext();
        var aggregates = new TrackedAggregates();
        var repository = new EfTransitionVideosRepository(context, aggregates);
        var videos = await repository.GetFor(_popToBird.Id, Ct);
        change(videos, new PgVideoPreparationQueue(context));
        repository.Save(videos);
        return await UnitOfWorks.For(context, aggregates).SaveChanges(Ct);
    }

    private async Task<TransitionVideos> Stored()
    {
        await using var context = database.CreateDbContext();
        return await new EfTransitionVideosRepository(context, new TrackedAggregates()).GetFor(_popToBird.Id, Ct);
    }

    private async Task<VideoPreparationJob?> Claim()
    {
        await using var context = database.CreateDbContext();
        return await new PgVideoPreparationQueue(context).Claim(Ct);
    }

    [Fact]
    public async Task GetFor_Should_GiveNoVideo_When_TheTransitionHasNone()
    {
        (await Stored()).InAdditionOrder().ShouldBeEmpty();
    }

    [Fact]
    public async Task Save_Should_StoreEveryValueOfTheVideos_When_TheyAreAdded()
    {
        var face = NewId();
        var side = NewId();
        (await Change((videos, _) =>
        {
            AddTo(videos, face, "Vue de face", "La base pousse.");
            AddTo(videos, side, "Vue de côté");
        })).IsSuccess.ShouldBeTrue();

        var stored = (await Stored()).InAdditionOrder();

        stored.Select(v => v.Id).ShouldBe([face, side]);
        var first = stored[0];
        first.Caption.Value.ShouldBe("Vue de face");
        first.Credit.Value.ShouldBe("Léa Martin");
        first.Description!.Value.ShouldBe("La base pousse.");
        first.Dimensions.ShouldBe(new VideoDimensions(720, 1280));
        first.Duration.ShouldBe(VideoDuration.FromMilliseconds(12_345));
        first.Preparation.ShouldBe(VideoPreparation.InPreparation);
        first.Rights.ShouldBe(new RightsConfirmation(Bruno, Now));
        first.AdditionRank.ShouldBe(1);
        first.AddedAt.ShouldBe(Now);
        stored[1].Description.ShouldBeNull();
    }

    [Fact]
    public async Task Save_Should_StoreThePreparationAndTheCorrections_When_TheVideosChange()
    {
        var face = NewId();
        await Change((videos, _) => AddTo(videos, face, "Vue de face"));

        (await Change((videos, _) =>
        {
            videos.MarkPrepared(face, new PreparedVideo(new VideoDimensions(718, 1280), VideoDuration.FromMilliseconds(12_400)), Now);
            videos.Correct(face, VideoCaption.Create("Pop to Bird, de face").Value!, VideoCredit.Create("Hugo Bernard").Value!,
                VideoDescription.Create("Au ralenti.").Value, Now);
        })).IsSuccess.ShouldBeTrue();

        var video = (await Stored()).InAdditionOrder().Single();
        video.Preparation.ShouldBe(VideoPreparation.Ready);
        video.Dimensions.ShouldBe(new VideoDimensions(718, 1280));
        video.Duration.ShouldBe(VideoDuration.FromMilliseconds(12_400));
        video.Caption.Value.ShouldBe("Pop to Bird, de face");
        video.Credit.Value.ShouldBe("Hugo Bernard");
        video.Description!.Value.ShouldBe("Au ralenti.");
    }

    [Fact]
    public async Task FindByVideo_Should_GiveTheVideosOfItsTransitionAsTheyAreStored_When_TheVideoIsOneOfThem()
    {
        var face = NewId();
        var side = NewId();
        await Change((videos, _) =>
        {
            AddTo(videos, face, "Vue de face");
            AddTo(videos, side, "Vue de côté");
        });
        await Change((videos, _) => videos.MarkPrepared(face, new PreparedVideo(new VideoDimensions(720, 1280), VideoDuration.FromMilliseconds(12_000)), Now));

        await using var context = database.CreateDbContext();
        var found = (await new EfTransitionVideosRepository(context, new TrackedAggregates()).FindByVideo(side, Ct)).ShouldNotBeNull();

        found.Id.ShouldBe(_popToBird.Id);
        found.InAdditionOrder().Select(v => (v.Id, v.Preparation)).ShouldBe([(face, VideoPreparation.Ready), (side, VideoPreparation.InPreparation)]);
    }

    [Fact]
    public async Task FindByVideo_Should_GiveNothing_When_TheVideoIsOneOfNoTransition()
    {
        await Change((videos, _) => AddTo(videos, NewId(), "Vue de face"));

        await using var context = database.CreateDbContext();
        (await new EfTransitionVideosRepository(context, new TrackedAggregates()).FindByVideo(NewId(), Ct)).ShouldBeNull();
    }

    [Fact]
    public async Task GetFor_Should_GiveTheVideosOfEachTransitionThatHasSome_When_SeveralAreAsked()
    {
        var face = NewId();
        await Change((videos, _) => AddTo(videos, face, "Vue de face"));

        await using var context = database.CreateDbContext();
        var byTransition = await new EfTransitionVideosRepository(context, new TrackedAggregates())
            .GetFor([_popToBird.Id, new TransitionId(Guid.NewGuid())], Ct);

        byTransition.Keys.ShouldBe([_popToBird.Id]);
        byTransition[_popToBird.Id].InAdditionOrder().Single().Id.ShouldBe(face);
    }

    [Fact]
    public async Task Save_Should_DeleteTheRemovedVideoAndItsJob_When_AVideoIsRemoved()
    {
        var face = NewId();
        var side = NewId();
        await Change((videos, queue) =>
        {
            AddTo(videos, face, "Vue de face");
            AddTo(videos, side, "Vue de côté");
            queue.Enqueue(face, _popToBird.Id, Now);
        });

        (await Change((videos, _) => videos.Remove(face, Now))).IsSuccess.ShouldBeTrue();

        (await Stored()).InAdditionOrder().Select(v => v.Id).ShouldBe([side]);
        (await Claim()).ShouldBeNull();
    }

    [Fact]
    public async Task Claim_Should_GiveTheOldestJobWithALeaseAndCountTheAttempt_When_JobsWait()
    {
        var face = NewId();
        var side = NewId();
        await Change((videos, queue) =>
        {
            AddTo(videos, face, "Vue de face");
            AddTo(videos, side, "Vue de côté");
            queue.Enqueue(face, _popToBird.Id, Now);
            queue.Enqueue(side, _popToBird.Id, Now.AddSeconds(1));
        });

        (await Claim()).ShouldBe(new VideoPreparationJob(face, _popToBird.Id, 1));
        (await Claim()).ShouldBe(new VideoPreparationJob(side, _popToBird.Id, 1));
        (await Claim()).ShouldBeNull();
    }

    [Fact]
    public async Task Claim_Should_NeverGiveTheSameJobTwice_When_TwoWorkersClaimAtTheSameTime()
    {
        var ids = Enumerable.Range(0, 6).Select(_ => NewId()).ToList();
        await Change((videos, queue) =>
        {
            for (var n = 0; n < ids.Count; n++)
            {
                if (n % 3 == 0 && n > 0) return;
                AddTo(videos, ids[n], $"Vue {n}");
                queue.Enqueue(ids[n], _popToBird.Id, Now.AddSeconds(n));
            }
        });

        var claims = await Task.WhenAll(Enumerable.Range(0, 8).Select(_ => Claim()));

        var claimed = claims.OfType<VideoPreparationJob>().Select(j => j.Video).ToList();
        claimed.Count.ShouldBe(3);
        claimed.ShouldBeUnique();
    }

    [Fact]
    public async Task Release_Should_GiveTheJobBackAtOnceWithoutCountingTheAttempt_When_TheWorkerStops()
    {
        var face = NewId();
        await Change((videos, queue) =>
        {
            AddTo(videos, face, "Vue de face");
            queue.Enqueue(face, _popToBird.Id, Now);
        });
        (await Claim()).ShouldNotBeNull();

        await using (var context = database.CreateDbContext()) await new PgVideoPreparationQueue(context).Release(face, Ct);

        (await Claim()).ShouldBe(new VideoPreparationJob(face, _popToBird.Id, 1));
    }

    [Fact]
    public async Task Claim_Should_GiveTheJobAgain_When_ItsLeaseExpired()
    {
        var face = NewId();
        await Change((videos, queue) =>
        {
            AddTo(videos, face, "Vue de face");
            queue.Enqueue(face, _popToBird.Id, Now);
        });
        (await Claim()).ShouldNotBeNull();
        await using (var context = database.CreateDbContext())
            await context.Set<VideoPreparationJobRecord>().ExecuteUpdateAsync(s => s.SetProperty(j => j.LeaseUntil, DateTimeOffset.UtcNow.AddMinutes(-1)), Ct);

        (await Claim()).ShouldBe(new VideoPreparationJob(face, _popToBird.Id, 2));
    }

    [Fact]
    public async Task Complete_Should_RemoveTheJob_When_TheOutcomeIsSavedWithIt()
    {
        var face = NewId();
        await Change((videos, queue) =>
        {
            AddTo(videos, face, "Vue de face");
            queue.Enqueue(face, _popToBird.Id, Now);
        });
        (await Claim()).ShouldNotBeNull();

        (await Change((videos, queue) =>
        {
            videos.MarkPreparationFailed(face, Now);
            queue.Complete(face);
        })).IsSuccess.ShouldBeTrue();

        await using var context = database.CreateDbContext();
        (await context.Set<VideoPreparationJobRecord>().CountAsync(Ct)).ShouldBe(0);
        (await Stored()).InAdditionOrder().Single().Preparation.ShouldBe(VideoPreparation.Failed);
    }

    [Fact]
    public async Task Run_Should_WaitForTheOtherChange_When_ItChangesTheVideosOfTheSameTransition()
    {
        var granted = TimeSpan.FromSeconds(10);
        var held = new TaskCompletionSource();
        var release = new TaskCompletionSource();
        var holding = Task.Run(async () =>
        {
            await using var context = database.CreateDbContext();
            return await new PgTransitionVideosLock(context).Run(_popToBird.Id, async _ =>
            {
                held.SetResult();
                await release.Task;
                return AcroFunJam.Domain.Common.Result<bool>.Success(true);
            }, Ct);
        }, Ct);
        await held.Task.WaitAsync(granted, Ct);

        async Task<AcroFunJam.Domain.Common.Result<bool>> Taking(TransitionId transition)
        {
            await using var context = database.CreateDbContext();
            return await new PgTransitionVideosLock(context).Run(transition, _ => Task.FromResult(AcroFunJam.Domain.Common.Result<bool>.Success(true)), Ct);
        }

        (await Taking(new TransitionId(Guid.NewGuid())).WaitAsync(granted, Ct)).IsSuccess.ShouldBeTrue();
        var waiting = Taking(_popToBird.Id);
        (await Task.WhenAny(waiting, Task.Delay(500, Ct))).ShouldNotBe(waiting);

        release.SetResult();
        (await holding).IsSuccess.ShouldBeTrue();
        (await waiting.WaitAsync(granted, Ct)).IsSuccess.ShouldBeTrue();
    }
}
