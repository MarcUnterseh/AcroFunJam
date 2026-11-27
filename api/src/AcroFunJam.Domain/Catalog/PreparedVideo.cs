using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Domain.Catalog;

/// <summary>What the preparation produced (ADR 0041): the dimensions of the prepared video and its duration, found at the decoding.</summary>
public sealed record PreparedVideo(VideoDimensions Dimensions, VideoDuration Duration);
