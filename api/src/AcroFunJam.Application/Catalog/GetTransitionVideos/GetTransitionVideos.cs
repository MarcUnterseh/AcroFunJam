using AcroFunJam.Domain.Catalog;

namespace AcroFunJam.Application.Catalog.GetTransitionVideos;

/// <summary>
/// The videos of a published transition, whatever their preparation, for whoever manages them (story 12, UX-52): the site asks
/// them again while one is in preparation.
/// </summary>
public sealed record GetTransitionVideos(TransitionId Transition);
