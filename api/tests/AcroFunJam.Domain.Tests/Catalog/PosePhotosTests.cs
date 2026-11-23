using AcroFunJam.Domain.Catalog;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Domain.Tests.Catalog;

/// <summary>
/// The photos of a pose (story 10, R1, R11 to R14): 5 at most, the main photo first then the order of addition, the main photo
/// chosen by a validator, the next one taking over when it is removed.
/// </summary>
public sealed class PosePhotosTests
{
    private static readonly PoseId Bird = new(Guid.Parse("b1000000-0000-0000-0000-000000000001"));
    private static readonly PhotoManagerId Bruno = new(Guid.Parse("0b000000-0000-0000-0000-000000000001"));
    private static readonly DateTimeOffset Now = new(2026, 11, 21, 10, 0, 0, TimeSpan.Zero);

    private static readonly PhotoFile Landscape =
        PhotoFile.Accept(PhotoFormat.Jpeg, PhotoFileSize.Create(2_000_000).Value!, new PhotoDimensions(1600, 1200)).Value!;

    private static PhotoId Id(int n) => new(Guid.Parse($"f0000000-0000-0000-0000-00000000000{n}"));

    private static AltText Alt(string text) => AltText.Create(text).Value!;

    private static PhotoCredit Credit(string text) => PhotoCredit.Create(text).Value!;

    private static PosePhotos WithPhotos(int count)
    {
        var photos = PosePhotos.For(Bird);
        for (var n = 1; n <= count; n++) photos.Add(Id(n), Landscape, Alt($"Bird {n}"), Credit("Léa Martin"), Rights(), Now).IsSuccess.ShouldBeTrue();
        photos.ClearDomainEvents();
        return photos;
    }

    private static RightsConfirmation Rights() => RightsConfirmation.Give(true, Bruno, Now).Value!;

    private static PhotoId[] Order(PosePhotos photos) => [.. photos.InPresentationOrder().Select(p => p.Id)];

    [Fact]
    public void For_Should_HaveNoPhotoNorMainPhoto_When_ThePoseHasNoPhotoYet()
    {
        var photos = PosePhotos.For(Bird);

        photos.Id.ShouldBe(Bird);
        photos.InPresentationOrder().ShouldBeEmpty();
        photos.MainPhotoId.ShouldBeNull();
        photos.DomainEvents.ShouldBeEmpty();
    }

    [Fact]
    public void Add_Should_MakeTheFirstPhotoTheMainPhoto_When_ThePoseHadNone()
    {
        var photos = PosePhotos.For(Bird);

        var added = photos.Add(Id(1), Landscape, Alt("Bird vue de profil"), Credit("Léa Martin"), Rights(), Now).Value!;

        added.Id.ShouldBe(Id(1));
        added.AltText.Value.ShouldBe("Bird vue de profil");
        added.Credit.Value.ShouldBe("Léa Martin");
        added.Dimensions.ShouldBe(new PhotoDimensions(1600, 1200));
        added.Rights.ShouldBe(Rights());
        added.AddedAt.ShouldBe(Now);
        photos.MainPhotoId.ShouldBe(Id(1));
        photos.DomainEvents.ShouldBe([new PhotoAdded(Bird, Id(1), Now)]);
    }

    [Fact]
    public void Add_Should_KeepTheMainPhotoAndTheOrderOfAddition_When_OtherPhotosAreAdded()
    {
        var photos = WithPhotos(3);

        photos.MainPhotoId.ShouldBe(Id(1));
        Order(photos).ShouldBe([Id(1), Id(2), Id(3)]);
    }

    [Fact]
    public void Add_Should_FailWithPhotoLimitReached_When_ThePoseHasAlready5Photos()
    {
        PosePhotos.MaxCount.ShouldBe(5);
        var photos = WithPhotos(5);

        photos.Add(Id(6), Landscape, Alt("Bird 6"), Credit("Léa Martin"), Rights(), Now).Error.ShouldBe(CatalogErrors.PhotoLimitReached);
        photos.DomainEvents.ShouldBeEmpty();
    }

    [Fact]
    public void Remove_Should_FreeAPlace_When_ThePoseHad5Photos()
    {
        var photos = WithPhotos(5);

        photos.Remove(Id(3), Now).IsSuccess.ShouldBeTrue();

        photos.Add(Id(6), Landscape, Alt("Bird 6"), Credit("Léa Martin"), Rights(), Now).IsSuccess.ShouldBeTrue();
    }

    [Fact]
    public void ChooseAsMain_Should_PresentTheChosenPhotoFirst_Then_TheOthersInTheOrderOfAddition()
    {
        var photos = WithPhotos(3);

        photos.ChooseAsMain(Id(3), Now).IsSuccess.ShouldBeTrue();
        Order(photos).ShouldBe([Id(3), Id(1), Id(2)]);

        photos.ChooseAsMain(Id(2), Now).IsSuccess.ShouldBeTrue();
        Order(photos).ShouldBe([Id(2), Id(1), Id(3)]);
        photos.MainPhotoId.ShouldBe(Id(2));
        photos.DomainEvents.ShouldBe([new MainPhotoChanged(Bird, Id(3), Now), new MainPhotoChanged(Bird, Id(2), Now)]);
    }

    [Fact]
    public void ChooseAsMain_Should_RaiseNothing_When_ThePhotoIsAlreadyTheMainPhoto()
    {
        var photos = WithPhotos(2);

        photos.ChooseAsMain(Id(1), Now).IsSuccess.ShouldBeTrue();

        photos.DomainEvents.ShouldBeEmpty();
    }

    [Fact]
    public void ChooseAsMain_Should_FailWithPhotoNotFound_When_ThePhotoIsNotOneOfThePose()
    {
        WithPhotos(2).ChooseAsMain(Id(9), Now).Error.ShouldBe(CatalogErrors.PhotoNotFound);
    }

    [Fact]
    public void Remove_Should_MakeTheNextPhotoTheMainPhoto_When_TheMainPhotoIsRemoved()
    {
        var photos = WithPhotos(3);

        photos.Remove(Id(1), Now).IsSuccess.ShouldBeTrue();

        photos.MainPhotoId.ShouldBe(Id(2));
        Order(photos).ShouldBe([Id(2), Id(3)]);
        photos.DomainEvents.ShouldBe([new PhotoRemoved(Bird, Id(1), Now)]);
    }

    [Fact]
    public void Remove_Should_MakeTheEarliestRemainingPhotoTheMainPhoto_When_AChosenMainPhotoIsRemoved()
    {
        var photos = WithPhotos(3);
        photos.ChooseAsMain(Id(3), Now);

        photos.Remove(Id(3), Now);

        photos.MainPhotoId.ShouldBe(Id(1));
        Order(photos).ShouldBe([Id(1), Id(2)]);
    }

    [Fact]
    public void Remove_Should_LeaveNoMainPhoto_When_TheLastPhotoIsRemoved()
    {
        var photos = WithPhotos(1);

        photos.Remove(Id(1), Now);

        photos.MainPhotoId.ShouldBeNull();
        photos.InPresentationOrder().ShouldBeEmpty();
    }

    [Fact]
    public void Remove_Should_FailWithPhotoNotFound_When_ThePhotoIsAlreadyRemoved()
    {
        var photos = WithPhotos(2);
        photos.Remove(Id(2), Now);

        photos.Remove(Id(2), Now).Error.ShouldBe(CatalogErrors.PhotoNotFound);
    }

    [Fact]
    public void Correct_Should_ChangeTheAltTextAndTheCredit_When_ThePhotoIsOneOfThePose()
    {
        var photos = WithPhotos(2);

        var corrected = photos.Correct(Id(2), Alt("Bird vue de face"), Credit("Hugo Bernard"), Now).Value!;

        corrected.AltText.Value.ShouldBe("Bird vue de face");
        corrected.Credit.Value.ShouldBe("Hugo Bernard");
        photos.DomainEvents.ShouldBe([new PhotoCorrected(Bird, Id(2), Now)]);
    }

    [Fact]
    public void Correct_Should_RaiseNothing_When_NothingChanges()
    {
        var photos = WithPhotos(1);

        photos.Correct(Id(1), Alt("Bird 1"), Credit("Léa Martin"), Now).IsSuccess.ShouldBeTrue();

        photos.DomainEvents.ShouldBeEmpty();
    }

    [Fact]
    public void Correct_Should_FailWithPhotoNotFound_When_ThePhotoIsNotOneOfThePose()
    {
        WithPhotos(1).Correct(Id(9), Alt("Bird"), Credit("Léa Martin"), Now).Error.ShouldBe(CatalogErrors.PhotoNotFound);
    }
}
