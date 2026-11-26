using AcroFunJam.Application.Catalog;
using AcroFunJam.Application.Catalog.AddPosePhoto;
using AcroFunJam.Application.Tests.Common;
using AcroFunJam.Application.Tests.Identity;
using AcroFunJam.Domain.Catalog;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Application.Tests.Catalog;

/// <summary>Adding a photo to a published pose (story 10, R1 to R11, ADR 0039).</summary>
public sealed class AddPosePhotoHandlerTests
{
    private static readonly DateTimeOffset On21November = new(2026, 11, 21, 10, 0, 0, TimeSpan.Zero);
    private static readonly PhotoManagerId Bruno = new(Guid.Parse("0b000000-0000-0000-0000-000000000001"));
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    private readonly FakePoseRepository _poses = new();
    private readonly FakePosePhotosRepository _photos = new();
    private readonly FakePosePhotosLock _lock = new();
    private readonly FakePhotoProcessor _processor = new();
    private readonly FakePhotoStorage _storage = new();
    private readonly FakeUnitOfWork _unitOfWork = new();
    private readonly Pose _bird;

    public AddPosePhotoHandlerTests()
    {
        _bird = Pose.Publish(new PoseId(Guid.NewGuid()), PoseName.Create("Bird").Value!,
            Difficulty.Create(DifficultyLevel.Discovery, DifficultyLevel.Beginner).Value!, FlowBoundaries.Create(true, true).Value!,
            source: null, nameAlreadyPublished: false, On21November).Value!;
        _poses.Add(_bird);
    }

    private AddPosePhotoHandler Handler(FakeUnitOfWork? unitOfWork = null) =>
        new(_poses, _photos, _lock, _processor, _storage, new FakePhotoAddresses(), unitOfWork ?? _unitOfWork, new FixedTimeProvider(On21November));

    private AddPosePhoto Adding(
        string? altText = "Bird vue de profil", string? credit = "Léa Martin", bool rights = true, int bytes = 2_000_000, PoseId? pose = null) =>
        new(pose ?? _bird.Id, new byte[bytes], altText, credit, rights, Bruno);

    [Fact]
    public async Task Handle_Should_AddThePhotoAndStoreItsSizes_When_EverythingIsValid()
    {
        PresentedPhoto added = (await Handler().Handle(Adding(), Ct)).Value!;

        added.AltText.ShouldBe("Bird vue de profil");
        added.Credit.ShouldBe("Léa Martin");
        added.Width.ShouldBe(1600);
        added.Height.ShouldBe(1200);
        added.Sources.Page.ShouldBe($"/catalog/photos/{added.Id.Value}/page");
        _storage.Files.Keys.ShouldBe([added.Id]);
        var photos = _photos.Stored[_bird.Id];
        photos.MainPhotoId.ShouldBe(added.Id);
        photos.InPresentationOrder().Single().Rights.ShouldBe(new RightsConfirmation(Bruno, On21November));
        _lock.Locked.ShouldBe([_bird.Id]);
        _unitOfWork.Saves.ShouldBe(1);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("    ")]
    public async Task Handle_Should_AddThePhotoWithoutAltText_When_TheAltTextIsMissingOrOnlySpaces(string? altText)
    {
        PresentedPhoto added = (await Handler().Handle(Adding(altText: altText), Ct)).Value!;

        added.AltText.ShouldBeNull();
        _photos.Stored[_bird.Id].InPresentationOrder().Single().AltText.ShouldBeNull();
    }

    [Fact]
    public async Task Handle_Should_NotChangeThePose_When_APhotoIsAdded()
    {
        var version = _bird.Version;

        await Handler().Handle(Adding(), Ct);

        _bird.Version.ShouldBe(version);
        _poses.Updated.ShouldBeEmpty();
    }

    [Fact]
    public async Task Handle_Should_FailWithPoseNotFound_When_ThePoseIsUnknown()
    {
        var result = await Handler().Handle(Adding(pose: new PoseId(Guid.NewGuid())), Ct);

        result.Error.ShouldBe(CatalogErrors.PoseNotFound);
        _processor.Probes.ShouldBe(0);
        _storage.Files.ShouldBeEmpty();
    }

    [Theory]
    [InlineData("Bird", "  ", true, "photo.credit-required")]
    [InlineData("Bird", "inconnu", true, "photo.credit-not-an-author")]
    [InlineData("Bird", "Léa Martin", false, "photo.rights-confirmation-required")]
    public async Task Handle_Should_RefuseBeforeAnyProcessing_When_ATextOrTheConfirmationIsInvalid(
        string? altText, string credit, bool rights, string code)
    {
        var result = await Handler().Handle(Adding(altText, credit, rights), Ct);

        result.Error!.Code.ShouldBe(code);
        _processor.Probes.ShouldBe(0);
    }

    [Fact]
    public async Task Handle_Should_FailWithTooLarge_When_TheFileWeighsMoreThan10MiB()
    {
        var result = await Handler().Handle(Adding(bytes: (int)PhotoFileSize.MaxBytes + 1), Ct);

        result.Error.ShouldBe(PhotoContentErrors.TooLarge);
        _processor.Probes.ShouldBe(0);
    }

    [Fact]
    public async Task Handle_Should_FailWithFileRequired_When_ThereIsNoFile()
    {
        (await Handler().Handle(Adding(bytes: 0), Ct)).Error.ShouldBe(PhotoContentErrors.FileRequired);
    }

    [Fact]
    public async Task Handle_Should_FailWithFormatNotAccepted_When_TheContentIsNotAnAcceptedPhoto()
    {
        _processor.Probe = new PhotoProbe(null, null);

        var result = await Handler().Handle(Adding(), Ct);

        result.Error.ShouldBe(PhotoContentErrors.FormatNotAccepted);
        _processor.Renders.ShouldBe(0);
        _storage.Files.ShouldBeEmpty();
    }

    [Fact]
    public async Task Handle_Should_FailWithTooSmall_When_TheShorterSideHasLessThan800Pixels()
    {
        _processor.Probe = new PhotoProbe(PhotoFormat.Jpeg, new PhotoDimensions(1200, 799));

        (await Handler().Handle(Adding(), Ct)).Error.ShouldBe(PhotoContentErrors.TooSmall);
    }

    [Fact]
    public async Task Handle_Should_FailWithUnreadable_When_ThePhotoCannotBeRendered()
    {
        _processor.Unreadable = true;

        var result = await Handler().Handle(Adding(), Ct);

        result.Error.ShouldBe(PhotoContentErrors.Unreadable);
        _storage.Files.ShouldBeEmpty();
    }

    [Fact]
    public async Task Handle_Should_FailWithPhotoLimitReached_BeforeProcessing_When_ThePoseHasAlready5Photos()
    {
        for (var n = 0; n < PosePhotos.MaxCount; n++) (await Handler().Handle(Adding(), Ct)).IsSuccess.ShouldBeTrue();
        var probes = _processor.Probes;

        var result = await Handler().Handle(Adding(), Ct);

        result.Error.ShouldBe(CatalogErrors.PhotoLimitReached);
        _processor.Probes.ShouldBe(probes);
    }

    [Fact]
    public async Task Handle_Should_DeleteTheStoredFiles_When_AnotherPhotoTookTheLastPlaceMeanwhile()
    {
        for (var n = 0; n < PosePhotos.MaxCount - 1; n++) await Handler().Handle(Adding(), Ct);
        // Another validator adds the fifth photo while this one is being processed.
        _lock.OnLock = () =>
        {
            _lock.OnLock = null;
            var other = _photos.Stored[_bird.Id];
            other.Add(new PhotoId(Guid.NewGuid()),
                PhotoFile.Accept(PhotoFormat.Jpeg, PhotoFileSize.Create(1).Value!, new PhotoDimensions(800, 800)).Value!,
                AltText.Create("Bird").Value!, PhotoCredit.Create("Paul").Value!, new RightsConfirmation(Bruno, On21November), On21November);
        };

        var result = await Handler().Handle(Adding(), Ct);

        result.Error.ShouldBe(CatalogErrors.PhotoLimitReached);
        _storage.Deleted.Count.ShouldBe(1);
        _storage.Files.Count.ShouldBe(PosePhotos.MaxCount - 1);
    }

    [Fact]
    public async Task Handle_Should_DeleteTheStoredFiles_When_TheSaveFails()
    {
        var refusing = new FakeUnitOfWork(CatalogErrors.PoseNotFound);

        var result = await Handler(refusing).Handle(Adding(), Ct);

        result.IsFailure.ShouldBeTrue();
        _storage.Files.ShouldBeEmpty();
        _storage.Deleted.Count.ShouldBe(1);
    }

    [Fact]
    public async Task Handle_Should_DeleteTheStoredFiles_When_TheSaveThrows()
    {
        var throwing = new FakeUnitOfWork { OnSave = () => throw new InvalidOperationException("connection lost") };

        await Should.ThrowAsync<InvalidOperationException>(() => Handler(throwing).Handle(Adding(), Ct));

        _storage.Files.ShouldBeEmpty();
        _storage.Deleted.Count.ShouldBe(1);
    }
}
