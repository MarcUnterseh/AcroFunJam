using AcroFunJam.Api.Endpoints.Common;
using AcroFunJam.Domain.Catalog;
using AcroFunJam.Domain.Common;
using AcroFunJam.Domain.Contribution;
using AcroFunJam.Domain.SharedKernel;
using Microsoft.AspNetCore.Http;

namespace AcroFunJam.Api.Tests;

/// <summary>The business error → HTTP status mapping shared by every endpoint (ADR 0007, ADR 0018).</summary>
public sealed class ProblemResultsTests
{
    public static TheoryData<Error, int> StatusByError() => new()
    {
        { ContributionErrors.UnknownContributor, StatusCodes.Status401Unauthorized },
        { AcroFunJam.Domain.Identity.IdentityErrors.AccountDeleted, StatusCodes.Status401Unauthorized },
        { PoseContentErrors.NameRequired, StatusCodes.Status400BadRequest },
        { PoseContentErrors.NameTooLong, StatusCodes.Status400BadRequest },
        { PoseContentErrors.BaseDifficultyRequired, StatusCodes.Status400BadRequest },
        { PoseContentErrors.FlyerDifficultyRequired, StatusCodes.Status400BadRequest },
        { PoseContentErrors.UnknownDifficultyLevel("expert"), StatusCodes.Status400BadRequest },
        { PoseContentErrors.CanStartFlowRequired, StatusCodes.Status400BadRequest },
        { PoseContentErrors.CanEndFlowRequired, StatusCodes.Status400BadRequest },
        { ContributionErrors.PoseNameAlreadyInCatalog, StatusCodes.Status409Conflict },
        { CatalogErrors.PoseNameTaken, StatusCodes.Status409Conflict },
        { ContributionErrors.PoseNameAlreadyPending, StatusCodes.Status409Conflict },
    };

    [Theory]
    [MemberData(nameof(StatusByError))]
    public void ToProblem_Should_UseTheStatusOfTheCode_When_TheErrorIsExpected(Error error, int status)
    {
        var problem = error.ToProblem();

        problem.StatusCode.ShouldBe(status);
        problem.ProblemDetails.Title.ShouldBe(error.Code);
        problem.ProblemDetails.Detail.ShouldBe(error.Message);
    }

    public static TheoryData<Error, int> StatusByDecisionError() => new()
    {
        { ContributionErrors.ProposalNotFound, StatusCodes.Status404NotFound },
        { ContributionErrors.ProposalAlreadyDecided, StatusCodes.Status409Conflict },
        { ContributionErrors.RejectionReasonRequired, StatusCodes.Status400BadRequest },
        { ContributionErrors.RejectionReasonTooLong, StatusCodes.Status400BadRequest },
        { ContributionErrors.UnknownValidator, StatusCodes.Status401Unauthorized },
        { ContributionErrors.ValidatorRequired, StatusCodes.Status403Forbidden },
    };

    [Theory]
    [MemberData(nameof(StatusByDecisionError))]
    public void ToProblem_Should_AnswerTheDecisionStatuses_When_TheErrorIsADecisionError(Error error, int status)
    {
        var problem = error.ToProblem();

        problem.StatusCode.ShouldBe(status);
        problem.ProblemDetails.Title.ShouldBe(error.Code);
    }

    [Fact]
    public void DifficultyCode_Should_SerializeAsTheDomainCode_When_ExposingEachLevel()
    {
        foreach (var level in Enum.GetValues<DifficultyLevel>())
        {
            System.Text.Json.JsonSerializer.Serialize(DifficultyCodes.From(level)).ShouldBe($"\"{level.ToCode()}\"");
        }
    }

    [Theory]
    [InlineData(ProposalStatus.Pending, "\"pending\"")]
    [InlineData(ProposalStatus.Accepted, "\"accepted\"")]
    [InlineData(ProposalStatus.Rejected, "\"rejected\"")]
    public void ProposalStatusCode_Should_SerializeAsTheStatusCode_When_ExposingEachStatus(ProposalStatus status, string json) =>
        System.Text.Json.JsonSerializer.Serialize(AcroFunJam.Api.Endpoints.Contribution.ProposalStatusCodes.From(status)).ShouldBe(json);
}
