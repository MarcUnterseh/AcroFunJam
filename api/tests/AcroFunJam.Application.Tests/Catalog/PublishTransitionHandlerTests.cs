using AcroFunJam.Application.Catalog.IsTransitionSlotPublished;
using AcroFunJam.Application.Catalog.PublishTransition;
using AcroFunJam.Application.Tests.Common;
using AcroFunJam.Application.Tests.Identity;
using AcroFunJam.Domain.Catalog;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Application.Tests.Catalog;

/// <summary>Publishing a transition in the catalog (story 7, ADR 0028, ADR 0029).</summary>
public sealed class PublishTransitionHandlerTests
{
    private static readonly DateTimeOffset Now = new(2026, 11, 13, 10, 0, 0, TimeSpan.Zero);
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    private static Pose APose(string name) => Pose.Publish(
        new PoseId(Guid.NewGuid()), PoseName.Create(name).Value!, Difficulty.Create(DifficultyLevel.Beginner, DifficultyLevel.Beginner).Value!,
        FlowBoundaries.Create(canStartFlow: true, canEndFlow: true).Value!, source: null, nameAlreadyPublished: false, Now).Value!;

    private readonly Pose _throne = APose("Throne");
    private readonly Pose _bird = APose("Bird");
    private readonly FakePoseRepository _poses = new();
    private readonly FakeTransitionRepository _transitions = new();
    private readonly FakeUnitOfWork _unitOfWork = new();

    public PublishTransitionHandlerTests()
    {
        _poses.Add(_throne);
        _poses.Add(_bird);
    }

    private PublishTransitionHandler Handler() => new(_poses, _transitions, new FakeTagListRepository(), _unitOfWork, new FixedTimeProvider(Now));

    private PublishTransition Unnamed(PoseId? to = null) => new(
        _throne.Id, to ?? _bird.Id, Name: null, Difficulty.Create(DifficultyLevel.Beginner, DifficultyLevel.Beginner).Value!, Description: null,
        new SourceProposalId(Guid.NewGuid()), Tags: []);

    [Fact]
    public async Task Handle_Should_AddAndSaveTheTransition_When_ItsPosesArePublishedAndItsPlaceFree()
    {
        var command = Unnamed();

        var result = await Handler().Handle(command, Ct);

        _transitions.Added.ShouldHaveSingleItem().ShouldSatisfyAllConditions(
            t => t.Id.ShouldBe(result.Value),
            t => t.FromPose.ShouldBe(_throne.Id),
            t => t.ToPose.ShouldBe(_bird.Id),
            t => t.SourceProposalId.ShouldBe(command.Source),
            t => t.PublishedAt.ShouldBe(Now));
        _unitOfWork.Saves.ShouldBe(1);
    }

    [Fact]
    public async Task Handle_Should_FailWithToPoseNotFoundAndSaveNothing_When_TheEndPoseIsNotPublished()
    {
        var result = await Handler().Handle(Unnamed(to: new PoseId(Guid.NewGuid())), Ct);

        result.Error.ShouldBe(CatalogErrors.ToPoseNotFound);
        _unitOfWork.Saves.ShouldBe(0);
    }

    [Fact]
    public async Task Handle_Should_FailWithUnnamedTransitionTaken_When_AnUnnamedTransitionLinksThePosesAlready()
    {
        await Handler().Handle(Unnamed(), Ct);

        var result = await Handler().Handle(Unnamed(), Ct);

        result.Error.ShouldBe(CatalogErrors.UnnamedTransitionTaken);
        _unitOfWork.Saves.ShouldBe(1);
    }

    [Fact]
    public async Task IsTransitionSlotPublished_Should_TellWhetherAPublishedTransitionTakesThePlace_When_Asked()
    {
        await Handler().Handle(Unnamed(), Ct);
        var handler = new IsTransitionSlotPublishedHandler(_transitions);

        (await handler.Handle(new IsTransitionSlotPublished(_throne.Id, _bird.Id, NameKey: null), Ct)).Value.ShouldBeTrue();
        var named = TransitionName.CreateOptional("Ninja Star").Value!.Key;
        (await handler.Handle(new IsTransitionSlotPublished(_throne.Id, _bird.Id, named), Ct)).Value.ShouldBeFalse();
        (await handler.Handle(new IsTransitionSlotPublished(_bird.Id, _throne.Id, NameKey: null), Ct)).Value.ShouldBeFalse();
    }
}
