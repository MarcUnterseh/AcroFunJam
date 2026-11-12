namespace AcroFunJam.Specs.Support;

/// <summary>
/// The last consultation of the scenario (the validation queue, my proposals…), shared by the steps that consult and
/// the step that checks a refusal (« la consultation est refusée car … »).
/// </summary>
public sealed class Consultation
{
    public HttpResponseMessage? Response { get; set; }
}
