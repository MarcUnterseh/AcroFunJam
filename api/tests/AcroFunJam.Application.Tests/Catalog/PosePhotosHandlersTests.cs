using AcroFunJam.Application.Catalog;
using AcroFunJam.Application.Catalog.ChooseMainPhoto;
using AcroFunJam.Application.Catalog.CorrectPhoto;
using AcroFunJam.Application.Catalog.GetPhotoRendition;
using AcroFunJam.Application.Catalog.GetPosePage;
using AcroFunJam.Application.Catalog.ListPublishedPoses;
using AcroFunJam.Application.Catalog.RemovePosePhoto;
using AcroFunJam.Application.Tests.Common;
using AcroFunJam.Application.Tests.Identity;
using AcroFunJam.Domain.Catalog;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Application.Tests.Catalog;

/// <summary>Managing and presenting the photos of a pose (story 10, R12 to R17, ADR 0039).</summary>
public sealed class PosePhotosHandlersTests
{
    private static readonly DateTimeOffset Now = new(2026, 11, 21, 10, 0, 0, TimeSpan.Zero);
    private static readonly PhotoManagerId Bruno = new(Guid.Parse("0b000000-0000-0000-0000-000000000001"));
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    private readonly FakePoseRepository _poses = new();
    private readonly FakePosePhotosRepository _photos = new();
    private readonly FakePosePhotosLock _lock = new();
    private readonly FakePhotoStorage _storage = new();
    private readonly FakePhotoAddresses _addresses = new();
    private readonly FakeUnitOfWork _unitOfWork = new();
    private readonly FixedTimeProvider _clock = new(Now);
    private readonly Pose _bird;

    public PosePhotosHandlersTests()
    {
        _bird = Pose.Publish(new PoseId(Guid.NewGuid()), PoseName.Create("Bird").Value!,
            Difficulty.Create(DifficultyLevel.Discovery, DifficultyLevel.Beginner).Value!, FlowBoundaries.Create(true, true).Value!,
            source: null, nameAlreadyPublished: false, Now).Value!;
        _poses.Add(_bird);
    }

    /// <summary>Gives Bird these photos, stored, in this order of addition.</summary>
    private PhotoId[] BirdHas(params string[] altTexts)
    {
        var photos = PosePhotos.For(_bird.Id);
        var ids = altTexts.Select(_ => new PhotoId(Guid.NewGuid())).ToArray();
        for (var i = 0; i < ids.Length; i++)
        {
            photos.Add(ids[i], PhotoFile.Accept(PhotoFormat.Jpeg, PhotoFileSize.Create(1).Value!, new PhotoDimensions(1600, 1200)).Value!,
                AltText.Create(altTexts[i]).Value!, PhotoCredit.Create("Léa Martin").Value!, new RightsConfirmation(Bruno, Now), Now);
            _storage.Files[ids[i]] = new PhotoRenditions([new RenderedPhoto(PhotoRendition.Page, 1200, 900, new byte[] { 42 })]);
        }

        photos.ClearDomainEvents();
        _photos.Stored[_bird.Id] = photos;
        return ids;
    }

    private string[] PresentedAltTexts() => [.. _photos.Stored[_bird.Id].InPresentationOrder().Select(p => p.AltText.Value)];

    // --- Removing (R13) --------------------------------------------------------------------------

    [Fact]
    public async Task RemovePosePhoto_Should_RemoveThePhotoThenDeleteItsSizes_When_ItIsOneOfThePose()
    {
        var ids = BirdHas("Bird vue de profil", "Bird vue de face");

        var result = await new RemovePosePhotoHandler(_photos, _lock, _storage, _unitOfWork, _clock).Handle(new RemovePosePhoto(_bird.Id, ids[0]), Ct);

        result.IsSuccess.ShouldBeTrue();
        PresentedAltTexts().ShouldBe(["Bird vue de face"]);
        _unitOfWork.Saves.ShouldBe(1);
        _storage.Deleted.ShouldBe([ids[0]]);
        _lock.Locked.ShouldBe([_bird.Id]);
    }

    [Fact]
    public async Task RemovePosePhoto_Should_FailWithPhotoNotFound_When_ThePhotoIsAlreadyRemoved()
    {
        BirdHas("Bird vue de profil");

        var result = await new RemovePosePhotoHandler(_photos, _lock, _storage, _unitOfWork, _clock)
            .Handle(new RemovePosePhoto(_bird.Id, new PhotoId(Guid.NewGuid())), Ct);

        result.Error.ShouldBe(CatalogErrors.PhotoNotFound);
        _storage.Deleted.ShouldBeEmpty();
    }

    [Fact]
    public async Task RemovePosePhoto_Should_FailWithPhotoNotFound_When_ThePoseHasNoPhoto()
    {
        (await new RemovePosePhotoHandler(_photos, _lock, _storage, _unitOfWork, _clock)
            .Handle(new RemovePosePhoto(_bird.Id, new PhotoId(Guid.NewGuid())), Ct)).Error.ShouldBe(CatalogErrors.PhotoNotFound);
    }

    [Fact]
    public async Task RemovePosePhoto_Should_KeepTheSizes_When_TheSaveFails()
    {
        var ids = BirdHas("Bird vue de profil");

        var result = await new RemovePosePhotoHandler(_photos, _lock, _storage, new FakeUnitOfWork(CatalogErrors.PoseNotFound), _clock)
            .Handle(new RemovePosePhoto(_bird.Id, ids[0]), Ct);

        result.IsFailure.ShouldBeTrue();
        _storage.Deleted.ShouldBeEmpty();
    }

    // --- Choosing the main photo (R12) ------------------------------------------------------------

    [Fact]
    public async Task ChooseMainPhoto_Should_PresentTheChosenPhotoFirst_When_ItIsOneOfThePose()
    {
        var ids = BirdHas("Bird vue de profil", "Bird vue de face", "Bird, les prises");

        var result = await new ChooseMainPhotoHandler(_photos, _lock, _unitOfWork, _clock).Handle(new ChooseMainPhoto(_bird.Id, ids[1]), Ct);

        result.IsSuccess.ShouldBeTrue();
        PresentedAltTexts().ShouldBe(["Bird vue de face", "Bird vue de profil", "Bird, les prises"]);
        _unitOfWork.Saves.ShouldBe(1);
    }

    [Fact]
    public async Task ChooseMainPhoto_Should_FailWithPhotoNotFound_When_ThePhotoIsUnknown()
    {
        BirdHas("Bird vue de profil");

        (await new ChooseMainPhotoHandler(_photos, _lock, _unitOfWork, _clock).Handle(new ChooseMainPhoto(_bird.Id, new PhotoId(Guid.NewGuid())), Ct))
            .Error.ShouldBe(CatalogErrors.PhotoNotFound);
        _unitOfWork.Saves.ShouldBe(0);
    }

    // --- Correcting (R14) -------------------------------------------------------------------------

    [Fact]
    public async Task CorrectPhoto_Should_ChangeTheAltTextAndTheCredit_When_TheyAreValid()
    {
        var ids = BirdHas("Bird");

        PresentedPhoto corrected = (await new CorrectPhotoHandler(_photos, _lock, _addresses, _unitOfWork, _clock)
            .Handle(new CorrectPhoto(_bird.Id, ids[0], "Bird vue de profil", "Léa Martin"), Ct)).Value!;

        corrected.AltText.ShouldBe("Bird vue de profil");
        PresentedAltTexts().ShouldBe(["Bird vue de profil"]);
        _unitOfWork.Saves.ShouldBe(1);
    }

    [Theory]
    [InlineData("  ", "Léa Martin", "photo.alt-text-required")]
    [InlineData("Bird", "Auteur inconnu", "photo.credit-not-an-author")]
    public async Task CorrectPhoto_Should_RefuseWithTheRulesOfAnAddition_When_ATextIsInvalid(string altText, string credit, string code)
    {
        var ids = BirdHas("Bird");

        (await new CorrectPhotoHandler(_photos, _lock, _addresses, _unitOfWork, _clock).Handle(new CorrectPhoto(_bird.Id, ids[0], altText, credit), Ct))
            .Error!.Code.ShouldBe(code);
        _unitOfWork.Saves.ShouldBe(0);
    }

    // --- Presenting (R16, R17, R13) ---------------------------------------------------------------

    [Fact]
    public async Task GetPosePage_Should_PresentThePhotosTheMainPhotoFirst_When_ThePoseHasSome()
    {
        var ids = BirdHas("Bird vue de profil", "Bird vue de face");
        _photos.Stored[_bird.Id].ChooseAsMain(ids[1], Now);

        var page = (await new GetPosePageHandler(_poses, new FakePoseTransitionsReader(), new FakeTagListRepository(), new FakePendingPoseRevisions(),
            _photos, _addresses).Handle(new GetPosePage(_bird.Id), Ct)).Value!;

        page.Photos.Select(p => p.AltText).ShouldBe(["Bird vue de face", "Bird vue de profil"]);
        page.Photos[0].Credit.ShouldBe("Léa Martin");
        page.Photos[0].Sources.ShouldBe(_addresses.Of(ids[1]));
    }

    [Fact]
    public async Task GetPosePage_Should_PresentNoPhoto_When_ThePoseHasNone()
    {
        var page = (await new GetPosePageHandler(_poses, new FakePoseTransitionsReader(), new FakeTagListRepository(), new FakePendingPoseRevisions(),
            _photos, _addresses).Handle(new GetPosePage(_bird.Id), Ct)).Value!;

        page.Photos.ShouldBeEmpty();
    }

    [Fact]
    public async Task ListPublishedPoses_Should_GiveTheThumbnailOfTheMainPhoto_When_APoseHasOne()
    {
        var bird = APublishedPose.Named("Bird").Build() with { Id = _bird.Id };
        var throne = APublishedPose.Named("Throne").Build();
        var ids = BirdHas("Bird vue de profil", "Bird vue de face");
        _photos.Stored[_bird.Id].ChooseAsMain(ids[1], Now);

        var poses = (await new ListPublishedPosesHandler(new FakePublishedPosesReader([bird, throne]), new FakeTagListRepository(), _photos, _addresses)
            .Handle(new ListPublishedPoses(), Ct)).Value!;

        poses.Select(p => (p.Pose.Name.Value, p.Thumbnail)).ShouldBe([("Bird", _addresses.Of(ids[1]).Thumbnail), ("Throne", (string?)null)]);
    }

    [Fact]
    public async Task GetPhotoRendition_Should_GiveTheStoredSize_When_ThePhotoIsOneOfAPose()
    {
        var ids = BirdHas("Bird vue de profil");

        await using var content = (await new GetPhotoRenditionHandler(_photos, _storage).Handle(new GetPhotoRendition(ids[0], PhotoRendition.Page), Ct)).Value!;

        content.ReadByte().ShouldBe(42);
    }

    [Fact]
    public async Task GetPhotoRendition_Should_FailWithPhotoNotFound_When_ThePhotoHasBeenRemoved_EvenIfItsSizesAreStillStored()
    {
        var ids = BirdHas("Bird vue de profil");
        _photos.Stored[_bird.Id].Remove(ids[0], Now);

        (await new GetPhotoRenditionHandler(_photos, _storage).Handle(new GetPhotoRendition(ids[0], PhotoRendition.Page), Ct))
            .Error.ShouldBe(CatalogErrors.PhotoNotFound);
    }
}
