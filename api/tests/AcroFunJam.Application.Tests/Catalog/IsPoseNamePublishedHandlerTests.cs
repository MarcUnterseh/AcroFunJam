using AcroFunJam.Application.Catalog.IsPoseNamePublished;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Application.Tests.Catalog;

public sealed class IsPoseNamePublishedHandlerTests
{
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    [Theory]
    [InlineData("high-bird", true)]
    [InlineData("Bird", false)]
    public async Task Handle_Should_TellWhetherAPublishedPoseHasTheKey_When_Asked(string name, bool published)
    {
        var handler = new IsPoseNamePublishedHandler(new FakePoseRepository("High Bird"));

        var result = await handler.Handle(new IsPoseNamePublished(PoseName.Create(name).Value!.Key), Ct);

        result.Value.ShouldBe(published);
    }
}
