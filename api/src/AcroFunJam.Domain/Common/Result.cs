namespace AcroFunJam.Domain.Common;

/// <summary>Outcome of a business operation: a value, or an expected business <see cref="Common.Error"/>.</summary>
public readonly record struct Result<T>
{
    public T? Value { get; }
    public Error? Error { get; }
    public bool IsSuccess => Error is null;
    public bool IsFailure => !IsSuccess;

    private Result(T? value, Error? error)
    {
        Value = value;
        Error = error;
    }

    public static Result<T> Success(T value) => new(value, null);

    public static Result<T> Failure(Error error)
    {
        ArgumentNullException.ThrowIfNull(error);
        return new(default, error);
    }

#pragma warning disable CA2225 // Failure(Error) is the named alternative.
    public static implicit operator Result<T>(Error error) => Failure(error);
#pragma warning restore CA2225
}
