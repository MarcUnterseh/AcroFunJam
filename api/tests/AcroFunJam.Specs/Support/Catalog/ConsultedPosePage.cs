namespace AcroFunJam.Specs.Support.Catalog;

/// <summary>
/// The last consultation of the page of a pose (« Quand un visiteur consulte la pose … »), shared by the steps that check what it
/// presents: its transitions (story 7) and their videos (story 12), which depend on who consults.
/// </summary>
public sealed class ConsultedPosePage
{
    public HttpResponseMessage? Response { get; set; }
}
