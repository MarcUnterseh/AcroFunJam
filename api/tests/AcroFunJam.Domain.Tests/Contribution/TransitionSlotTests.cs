using AcroFunJam.Domain.Contribution;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Domain.Tests.Contribution;

/// <summary>
/// The place a transition takes between its poses, in its direction (story 7, R9, R10, ADR 0029): the only unnamed one, or its
/// name, compared by key.
/// </summary>
public sealed class TransitionSlotTests
{
    private static readonly TransitionPoses StarToStar = TransitionPoses.Create(Guid.NewGuid(), Guid.NewGuid()).Value!;

    private static TransitionName Named(string name) => TransitionName.CreateOptional(name).Value!;

    [Fact]
    public void Of_Should_TakeTheSamePlace_When_TwoNamesHaveTheSameKey()
    {
        TransitionSlot.Of(StarToStar, Named("Ninja Star")).ShouldBe(TransitionSlot.Of(StarToStar, Named("ninja-star")));
    }

    [Fact]
    public void Of_Should_TakeTheUnnamedPlace_When_TheTransitionHasNoName()
    {
        var slot = TransitionSlot.Of(StarToStar, name: null);

        slot.IsUnnamed.ShouldBeTrue();
        slot.NameKey.ShouldBeNull();
        slot.ShouldBe(TransitionSlot.Of(StarToStar, name: null));
    }

    [Fact]
    public void Of_Should_TakeAnotherPlace_When_TheTransitionIsNamedNextToAnUnnamedOne()
    {
        TransitionSlot.Of(StarToStar, Named("Ninja Star")).ShouldNotBe(TransitionSlot.Of(StarToStar, name: null));
    }

    [Fact]
    public void Of_Should_TakeAnotherPlace_When_TheSameNameLinksOtherPoses()
    {
        var throneToStar = TransitionPoses.Create(Guid.NewGuid(), StarToStar.To.Value).Value!;

        TransitionSlot.Of(StarToStar, Named("Ninja Star")).ShouldNotBe(TransitionSlot.Of(throneToStar, Named("Ninja Star")));
    }

    [Theory]
    [InlineData(true, true, TransitionSlotAvailability.TakenByPublishedTransition)]
    [InlineData(true, false, TransitionSlotAvailability.TakenByPublishedTransition)]
    [InlineData(false, true, TransitionSlotAvailability.TakenByPendingProposal)]
    [InlineData(false, false, TransitionSlotAvailability.Available)]
    public void From_Should_LetTheCatalogPrevail_When_ThePlaceIsTakenByBoth(bool published, bool pending, TransitionSlotAvailability expected)
    {
        TransitionSlotAvailability.From(publishedInCatalog: published, pendingProposal: pending).ShouldBe(expected);
    }
}
