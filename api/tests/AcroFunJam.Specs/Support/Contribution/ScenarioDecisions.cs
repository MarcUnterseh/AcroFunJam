namespace AcroFunJam.Specs.Support.Contribution;

/// <summary>
/// The last decision of the scenario (acceptance or rejection), shared by the step classes, so that one outcome step
/// (« la décision est impossible car … ») checks a decision on a pose proposal as well as on a revision proposal.
/// </summary>
public sealed class ScenarioDecisions
{
    public HttpResponseMessage? Last
    {
        get;
        set
        {
            field = value;
            OnRevision = false;
            OnTransition = null;
            OnPose = null;
        }
    }

    /// <summary>The pose proposal the last acceptance was on (story 9a), if it was on one.</summary>
    public Guid? OnPose { get; private set; }

    public void OnPoseProposal(HttpResponseMessage response, Guid proposal)
    {
        Last = response;
        OnPose = proposal;
    }

    /// <summary>The transition proposal the last decision was on (story 7), if it was on one.</summary>
    public Guid? OnTransition { get; private set; }

    public void OnTransitionProposal(HttpResponseMessage response, Guid proposal)
    {
        Last = response;
        OnTransition = proposal;
    }

    /// <summary>Whether the last decision was on a revision proposal (story 6) rather than on a pose proposal.</summary>
    public bool OnRevision { get; private set; }

    public void OnRevisionProposal(HttpResponseMessage response)
    {
        Last = response;
        OnRevision = true;
    }
}
