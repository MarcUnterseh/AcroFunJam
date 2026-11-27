namespace AcroFunJam.Application.Catalog.PrepareNextVideo;

/// <summary>
/// The worker prepares the next video waiting (story 12, V8 to V11, ADR 0041): its outcome is whether a video was handled, so that
/// the worker waits before asking again when none waits.
/// </summary>
public sealed record PrepareNextVideo;
