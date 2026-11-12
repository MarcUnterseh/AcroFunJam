namespace AcroFunJam.Domain.Contribution;

/// <summary>
/// What a validator decided on a proposal, by whom and when. Irreversible: a proposal has at most one. Built only by the
/// decisions themselves (<see cref="Acceptance"/>, <see cref="Rejection"/>): neither its decider nor its date can be changed.
/// </summary>
public abstract record ProposalDecision
{
    public ValidatorId By { get; }

    public DateTimeOffset At { get; }

    protected ProposalDecision(ValidatorId by, DateTimeOffset at)
    {
        By = by;
        At = at;
    }
}
