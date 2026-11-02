using AcroFunJam.Domain.Common;

namespace AcroFunJam.Domain.Tests.Common;

public sealed class ResultTests
{
    private static readonly Error SomeError = new("test.failure", "Something went wrong");

    [Fact]
    public void Success_Should_ExposeTheValue_When_TheOperationSucceeded()
    {
        var result = Result<int>.Success(42);

        result.IsSuccess.ShouldBeTrue();
        result.IsFailure.ShouldBeFalse();
        result.Value.ShouldBe(42);
        result.Error.ShouldBeNull();
    }

    [Fact]
    public void Failure_Should_ExposeTheError_When_TheOperationFailed()
    {
        var result = Result<int>.Failure(SomeError);

        result.IsSuccess.ShouldBeFalse();
        result.IsFailure.ShouldBeTrue();
        result.Error.ShouldBe(SomeError);
    }

    [Fact]
    public void ImplicitConversion_Should_CreateAFailure_When_AnErrorIsReturned()
    {
        Result<int> result = SomeError;

        result.Error.ShouldBe(SomeError);
    }

    [Fact]
    public void Failure_Should_Throw_When_TheErrorIsNull()
    {
        Should.Throw<ArgumentNullException>(() => Result<int>.Failure(null!));
    }

    [Fact]
    public void Error_Should_BeEqual_When_CodeAndMessageAreEqual()
    {
        new Error("a.b", "msg").ShouldBe(new Error("a.b", "msg"));
    }
}
