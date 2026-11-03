using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Domain.Tests.SharedKernel;

public sealed class FlowBoundariesTests
{
    [Fact]
    public void Create_Should_ExposeBothIndicators_When_BothAreGiven()
    {
        var flow = FlowBoundaries.Create(canStartFlow: true, canEndFlow: true);

        flow.IsSuccess.ShouldBeTrue();
        flow.Value!.CanStartFlow.ShouldBeTrue();
        flow.Value.CanEndFlow.ShouldBeTrue();
    }

    [Theory]
    [InlineData(true, true)]
    [InlineData(false, true)]
    [InlineData(true, false)]
    [InlineData(false, false)]
    public void Create_Should_AcceptEveryCombination_When_BothIndicatorsAreGiven(bool canStart, bool canEnd)
    {
        var flow = FlowBoundaries.Create(canStart, canEnd).Value!;

        flow.CanStartFlow.ShouldBe(canStart);
        flow.CanEndFlow.ShouldBe(canEnd);
    }

    [Fact]
    public void Create_Should_FailWithCanStartFlowRequired_When_TheStartIndicatorIsMissing()
    {
        FlowBoundaries.Create(null, true).Error.ShouldBe(PoseContentErrors.CanStartFlowRequired);
    }

    [Fact]
    public void Create_Should_FailWithCanEndFlowRequired_When_TheEndIndicatorIsMissing()
    {
        FlowBoundaries.Create(true, null).Error.ShouldBe(PoseContentErrors.CanEndFlowRequired);
    }
}
