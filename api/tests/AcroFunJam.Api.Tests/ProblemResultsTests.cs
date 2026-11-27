using AcroFunJam.Api.Endpoints.Common;
using AcroFunJam.Domain.Catalog;
using AcroFunJam.Domain.Common;
using AcroFunJam.Domain.Contribution;
using AcroFunJam.Domain.FlowGeneration;
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
        // Story 9 (ADR 0037).
        { FlowGenerationErrors.LengthRequired, StatusCodes.Status400BadRequest },
        { FlowGenerationErrors.LengthOutOfRange, StatusCodes.Status400BadRequest },
        { FlowGenerationErrors.BaseDifficultyCeilingRequired, StatusCodes.Status400BadRequest },
        { FlowGenerationErrors.FlyerDifficultyCeilingRequired, StatusCodes.Status400BadRequest },
        { new TagsNotInListError(TagSet.Of([new TagId(Guid.NewGuid())])), StatusCodes.Status409Conflict },
        { FlowGenerationErrors.CriteriaTooRestrictive, StatusCodes.Status422UnprocessableEntity },
        { FlowGenerationErrors.CatalogInsufficient, StatusCodes.Status422UnprocessableEntity },
        // Story 12 (ADR 0041).
        { VideoContentErrors.FileRequired, StatusCodes.Status400BadRequest },
        { VideoContentErrors.FormatNotAccepted, StatusCodes.Status400BadRequest },
        { VideoContentErrors.TooLong(31), StatusCodes.Status400BadRequest },
        { VideoContentErrors.TooShort, StatusCodes.Status400BadRequest },
        { VideoContentErrors.TooSmall, StatusCodes.Status400BadRequest },
        { VideoContentErrors.Unreadable, StatusCodes.Status400BadRequest },
        { VideoContentErrors.CaptionRequired, StatusCodes.Status400BadRequest },
        { VideoContentErrors.CaptionTooLong, StatusCodes.Status400BadRequest },
        { VideoContentErrors.CreditRequired, StatusCodes.Status400BadRequest },
        { VideoContentErrors.CreditTooLong, StatusCodes.Status400BadRequest },
        { VideoContentErrors.CreditNotAnAuthor, StatusCodes.Status400BadRequest },
        { VideoContentErrors.DescriptionTooLong, StatusCodes.Status400BadRequest },
        { VideoContentErrors.RightsConfirmationRequired, StatusCodes.Status400BadRequest },
        { VideoContentErrors.TooLarge, StatusCodes.Status413PayloadTooLarge },
        { CatalogErrors.TransitionNotFound, StatusCodes.Status404NotFound },
        { CatalogErrors.VideoNotFound, StatusCodes.Status404NotFound },
        { CatalogErrors.VideoLimitReached, StatusCodes.Status409Conflict },
    };

    [Fact]
    public void ToProblem_Should_GiveTheTruncatedSeconds_When_AVideoIsTooLong()
    {
        VideoContentErrors.TooLong(31).ToProblem().ProblemDetails.Extensions["durationSeconds"].ShouldBe(31);
    }

    [Fact]
    public void ToProblem_Should_ListTheTagsNotInTheList_When_AGenerationRefusesThem()
    {
        var tag = new TagId(Guid.NewGuid());

        new TagsNotInListError(TagSet.Of([tag])).ToProblem().ProblemDetails.Extensions["tagIds"].ShouldBe(new List<Guid> { tag.Value });
    }

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
        { ContributionErrors.AdjustmentNoteTooLong, StatusCodes.Status400BadRequest },
        { ContributionErrors.AdjustmentNoteWithoutAdjustment, StatusCodes.Status422UnprocessableEntity },
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
