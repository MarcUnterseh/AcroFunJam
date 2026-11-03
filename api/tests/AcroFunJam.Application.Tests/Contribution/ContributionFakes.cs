using AcroFunJam.Application.Contribution;
using AcroFunJam.Domain.Common;
using AcroFunJam.Domain.Contribution;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Application.Tests.Contribution;

/// <summary>In-memory fake of <see cref="IContributors"/>.</summary>
internal sealed class FakeContributors(params Contributor[] contributors) : IContributors
{
    public Task<Contributor?> Find(ContributorId id, CancellationToken ct) =>
        Task.FromResult(contributors.SingleOrDefault(c => c.Id == id));
}

/// <summary>
/// Fake of <see cref="IPoseNameReservation"/>: runs the work, records the reserved keys and tells whether a work
/// is running, so that the other fakes can record whether they were called inside the reservation.
/// </summary>
internal sealed class FakePoseNameReservation : IPoseNameReservation
{
    public List<PoseNameKey> Reserved { get; } = [];

    public bool IsHeld { get; private set; }

    public async Task<Result<T>> Run<T>(PoseNameKey key, Func<CancellationToken, Task<Result<T>>> work, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(work);
        Reserved.Add(key);
        IsHeld = true;
        try
        {
            return await work(ct);
        }
        finally
        {
            IsHeld = false;
        }
    }
}

/// <summary>Records, for each call of a port, whether it happened inside the name reservation.</summary>
internal abstract class ReservationAwareFake
{
    public FakePoseNameReservation? Reservation { get; init; }

    public List<bool> CallsInReservation { get; } = [];

    protected void Called() => CallsInReservation.Add(Reservation?.IsHeld == true);
}

/// <summary>In-memory fake of <see cref="ICatalogPoseNames"/>: the keys of the published poses, or a failing query.</summary>
internal sealed class FakeCatalogPoseNames(params string[] publishedNames) : ReservationAwareFake, ICatalogPoseNames
{
    public Error? Failure { get; init; }

    public Task<Result<bool>> IsPublished(PoseNameKey key, CancellationToken ct)
    {
        Called();
        if (Failure is not null) return Task.FromResult<Result<bool>>(Failure);
        return Task.FromResult(Result<bool>.Success(publishedNames.Any(n => PoseName.Create(n).Value!.Key == key)));
    }
}

/// <summary>In-memory fake of <see cref="IPoseProposalRepository"/>.</summary>
internal sealed class FakePoseProposalRepository(params string[] pendingNames) : ReservationAwareFake, IPoseProposalRepository
{
    public List<PoseProposal> Added { get; } = [];

    public List<bool> AddsInReservation { get; } = [];

    public void Add(PoseProposal proposal)
    {
        AddsInReservation.Add(Reservation?.IsHeld == true);
        Added.Add(proposal);
    }

    public Task<bool> ExistsPendingWithNameKey(PoseNameKey key, CancellationToken ct)
    {
        Called();
        return Task.FromResult(pendingNames.Any(n => PoseName.Create(n).Value!.Key == key));
    }
}

/// <summary>Fake of <see cref="ICatalogPublisher"/>: records the publications, or refuses them with an error.</summary>
internal sealed class FakeCatalogPublisher(Error? refusal = null) : ReservationAwareFake, ICatalogPublisher
{
    public List<(PoseProposalId Source, ProposedPose Pose)> Published { get; } = [];

    public Task<Result<bool>> PublishPose(PoseProposalId source, ProposedPose pose, CancellationToken ct)
    {
        Called();
        if (refusal is not null) return Task.FromResult<Result<bool>>(refusal);
        Published.Add((source, pose));
        return Task.FromResult(Result<bool>.Success(true));
    }
}
