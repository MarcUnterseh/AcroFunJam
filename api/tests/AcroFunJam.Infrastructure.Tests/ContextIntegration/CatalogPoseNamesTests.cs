using AcroFunJam.Application.Catalog.IsPoseNamePublished;
using AcroFunJam.Application.Common;
using AcroFunJam.Domain.Common;
using AcroFunJam.Domain.SharedKernel;
using AcroFunJam.Infrastructure.ContextIntegration;

namespace AcroFunJam.Infrastructure.Tests.ContextIntegration;

public sealed class CatalogPoseNamesTests
{
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    /// <summary>Fake of the Catalog query: the published name keys, or a failure.</summary>
    private sealed class FakeIsPoseNamePublished(Error? failure, params string[] published) : IQueryHandler<IsPoseNamePublished, bool>
    {
        public Task<Result<bool>> Handle(IsPoseNamePublished query, CancellationToken ct) =>
            Task.FromResult(failure is null
                ? Result<bool>.Success(published.Contains(query.Key.Value, StringComparer.Ordinal))
                : Result<bool>.Failure(failure));
    }

    [Theory]
    [InlineData("High-Bird", true)]
    [InlineData("Bird", false)]
    public async Task IsPublished_Should_AskTheCatalogWithTheKey_When_ContributionChecksAName(string name, bool published)
    {
        var names = new CatalogPoseNames(new FakeIsPoseNamePublished(null, "high bird"));

        (await names.IsPublished(PoseName.Create(name).Value!.Key, Ct)).Value.ShouldBe(published);
    }

    [Fact]
    public async Task IsPublished_Should_PassTheFailureOn_When_TheCatalogQueryFails()
    {
        var failure = new Error("catalog.unavailable", "Indisponible.");
        var names = new CatalogPoseNames(new FakeIsPoseNamePublished(failure));

        (await names.IsPublished(PoseName.Create("Bird").Value!.Key, Ct)).Error.ShouldBe(failure);
    }
}
