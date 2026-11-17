using AcroFunJam.Application.Contribution;
using AcroFunJam.Application.Contribution.AcceptTransitionProposal;
using AcroFunJam.Application.Contribution.ProposeTransition;
using AcroFunJam.Application.Tests.Common;
using AcroFunJam.Application.Tests.Identity;
using AcroFunJam.Domain.Contribution;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Application.Tests.Contribution;

/// <summary>The tags of a proposed transition, chosen through the list of the Catalog (story 8, E1 to E7, ADR 0033).</summary>
public sealed class TransitionProposalTagsHandlersTests
{
    private static readonly DateTimeOffset Now = new(2026, 11, 17, 10, 0, 0, TimeSpan.Zero);
    private static readonly Contributor Alice = new(new ContributorId(Guid.NewGuid()), IsValidator: false);
    private static readonly Contributor Claire = new(new ContributorId(Guid.NewGuid()), IsValidator: true);
    private static readonly Validator Bruno = new(new ValidatorId(Guid.NewGuid()), CanDecide: true);
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    private static PublishedPose APose(string name) => new(
        new PublishedPoseId(Guid.NewGuid()),
        new PriorPose(
            PoseName.Create(name).Value!, Difficulty.Create(DifficultyLevel.Beginner, DifficultyLevel.Beginner).Value!,
            FlowBoundaries.Create(canStartFlow: true, canEndFlow: true).Value!),
        new PublishedPoseVersion(1));

    private static readonly PublishedPose Throne = APose("Throne");
    private static readonly PublishedPose Bird = APose("Bird");
    private static readonly TransitionPoses ThroneToBird = new(Throne.Id, Bird.Id);
    private static readonly ProposedTransition PopToBird = ProposedTransition.Create("Pop to Bird", "beginner", "beginner", null).Value!;

    private static readonly TagId Pop = new(Guid.NewGuid());
    private static readonly TagId Dynamic = new(Guid.NewGuid());
    private static readonly TagId Inversion = new(Guid.NewGuid());

    private readonly FakeTransitionReservation _reservation = new();
    private readonly FakeTransitionProposalRepository _proposals;
    private readonly FakeUnitOfWork _unitOfWork = new();
    private readonly FakeCatalogPublisher _publisher;
    private readonly FakeCatalogTags _tags;

    public TransitionProposalTagsHandlersTests()
    {
        _proposals = new FakeTransitionProposalRepository(_reservation);
        _publisher = new FakeCatalogPublisher { TransitionReservation = _reservation };
        _tags = new FakeCatalogTags(_reservation, (Pop, Dynamic), (Dynamic, null), (Inversion, null));
    }

    private ProposeTransitionHandler Proposing(Contributor contributor) =>
        new(new FakeContributors(contributor), new FakeCatalogPoses(Throne, Bird), new FakeCatalogTransitions(), _proposals, _reservation, _publisher,
            _unitOfWork, new FixedTimeProvider(Now), _tags);

    private AcceptTransitionProposalHandler Accepting() =>
        new(new FakeValidators(Bruno), _proposals, new FakeCatalogPoses(Throne, Bird), new FakeCatalogTransitions(), _reservation, _publisher,
            _unitOfWork, new FixedTimeProvider(Now), _tags);

    [Fact]
    public async Task ProposeTransition_Should_ProposeTheTagsChosenThroughTheList_When_InsideTheReservation()
    {
        var result = await Proposing(Alice).Handle(new ProposeTransition(Alice.Id, ThroneToBird, PopToBird, [Pop, Inversion]), Ct);

        result.Value!.Transition.Tags.ShouldBe(TagSet.Of([Pop, Dynamic, Inversion]));
        _proposals.Added.ShouldHaveSingleItem().Proposed.Tags.ShouldBe(TagSet.Of([Pop, Dynamic, Inversion]));
        _tags.ChosenInReservation.ShouldBe([true]);
    }

    [Fact]
    public async Task ProposeTransition_Should_FailWithTagNotInListAndSaveNothing_When_ATagIsNotInTheList()
    {
        var result = await Proposing(Alice).Handle(new ProposeTransition(Alice.Id, ThroneToBird, PopToBird, [new TagId(Guid.NewGuid())]), Ct);

        result.Error.ShouldBeOfType<ProposedTagsNotInListError>();
        _unitOfWork.Saves.ShouldBe(0);
    }

    [Fact]
    public async Task ProposeTransition_Should_PublishTheTags_When_AValidatorProposes()
    {
        await Proposing(Claire).Handle(new ProposeTransition(Claire.Id, ThroneToBird, PopToBird, [Pop]), Ct);

        _publisher.PublishedTransitions.ShouldHaveSingleItem().Transition.Tags.ShouldBe(TagSet.Of([Pop, Dynamic]));
    }

    private TransitionProposal Pending(params TagId[] tags)
    {
        var proposal = TransitionProposal.Submit(
            new TransitionProposalId(Guid.NewGuid()), Alice, ThroneToBird, PopToBird, fromPosePublished: true, toPosePublished: true,
            TransitionSlotAvailability.Available, Now, new TagChoice(TagSet.Of(tags), TagSet.Empty)).Value!;
        _proposals.Stored.Add(proposal);
        return proposal;
    }

    [Fact]
    public async Task AcceptTransitionProposal_Should_PublishTheRetainedTagsChosenThroughTheList_When_TheValidatorAdjustsThem()
    {
        var proposal = Pending(Pop, Dynamic, Inversion);

        var result = await Accepting().Handle(
            new AcceptTransitionProposal(proposal.Id, Bruno.Id, TransitionAdjustments.None, Note: null, [Pop]), Ct);

        result.Value!.HasAdjustments.ShouldBeTrue();
        _publisher.PublishedTransitions.ShouldHaveSingleItem().Transition.Tags.ShouldBe(TagSet.Of([Pop, Dynamic]));
        _tags.ChosenInReservation.ShouldBe([true]);
    }

    [Fact]
    public async Task AcceptTransitionProposal_Should_KeepTheProposedTags_When_NoneAreGiven()
    {
        var proposal = Pending(Pop, Dynamic);

        var result = await Accepting().Handle(new AcceptTransitionProposal(proposal.Id, Bruno.Id, TransitionAdjustments.None, Note: null), Ct);

        result.Value!.HasAdjustments.ShouldBeFalse();
        _publisher.PublishedTransitions.ShouldHaveSingleItem().Transition.Tags.ShouldBe(TagSet.Of([Pop, Dynamic]));
        _tags.ChosenInReservation.ShouldBeEmpty();
    }
}

/// <summary>
/// Fake of <see cref="ICatalogTags"/>: a list of tags, each with the tag it implies, choosing as the list does; it records whether each
/// choice happened inside the reservation of a couple of poses.
/// </summary>
internal sealed class FakeCatalogTags(FakeTransitionReservation? reservation, params (TagId Tag, TagId? Implies)[] list) : ICatalogTags
{
    public List<bool> ChosenInReservation { get; } = [];

    public Dictionary<TagId, TagName> Names { get; } = [];

    public Task<TagChoice> Choose(IReadOnlyCollection<TagId> tags, CancellationToken ct)
    {
        ChosenInReservation.Add(reservation?.IsHeld == true);
        var known = tags.Where(t => list.Any(l => l.Tag == t)).ToList();
        var implied = known.Select(t => list.Single(l => l.Tag == t).Implies).OfType<TagId>();
        return Task.FromResult(new TagChoice(TagSet.Of(known.Concat(implied)), TagSet.Of(tags.Where(t => list.All(l => l.Tag != t)))));
    }

    public Task<IReadOnlyDictionary<TagId, TagName>> NamesOf(TagSet tags, CancellationToken ct) =>
        Task.FromResult<IReadOnlyDictionary<TagId, TagName>>(Names.Where(n => tags.Contains(n.Key)).ToDictionary());
}
