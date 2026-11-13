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
/// Fake of <see cref="IPoseReservation"/>: runs the work, records the reserved keys and tells whether a work
/// is running, so that the other fakes can record whether they were called inside the reservation.
/// </summary>
internal sealed class FakePoseReservation : IPoseReservation
{
    public List<PoseNameKey> Reserved { get; } = [];

    /// <summary>The published poses reserved, in the order of the reservations (ADR 0025).</summary>
    public List<PublishedPoseId> ReservedPoses { get; } = [];

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

    public Task<Result<T>> Run<T>(PublishedPoseId pose, PoseNameKey? key, Func<CancellationToken, Task<Result<T>>> work, CancellationToken ct)
    {
        ReservedPoses.Add(pose);
        if (key is not null) return Run(key, work, ct);
        return Held(work, ct);
    }

    private async Task<Result<T>> Held<T>(Func<CancellationToken, Task<Result<T>>> work, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(work);
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
    public FakePoseReservation? Reservation { get; init; }

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
    /// <summary>The proposals already stored, found by <see cref="GetById"/>.</summary>
    public IReadOnlyList<PoseProposal> Stored { get; init; } = [];

    public List<PoseProposal> Added { get; } = [];

    public List<PoseProposal> Updated { get; } = [];

    /// <summary>For each read by <see cref="GetById"/>, whether it happened inside the name reservation.</summary>
    public List<bool> ReadsInReservation { get; } = [];

    public Task<PoseProposal?> GetById(PoseProposalId id, CancellationToken ct)
    {
        ReadsInReservation.Add(Reservation?.IsHeld == true);
        return Task.FromResult(Stored.SingleOrDefault(p => p.Id == id));
    }

    public void Update(PoseProposal proposal) => Updated.Add(proposal);

    public List<bool> AddsInReservation { get; } = [];

    public void Add(PoseProposal proposal)
    {
        AddsInReservation.Add(Reservation?.IsHeld == true);
        Added.Add(proposal);
    }

    public Task<bool> ExistsPendingWithNameKey(PoseNameKey key, CancellationToken ct)
    {
        Called();
        return Task.FromResult(PendingKeys(except: null).Contains(key));
    }

    public Task<bool> ExistsOtherPendingWithNameKey(PoseNameKey key, PoseProposalId except, CancellationToken ct)
    {
        Called();
        return Task.FromResult(PendingKeys(except).Contains(key));
    }

    /// <summary>The keys of the pending names given, and of the stored proposals still pending (but the excepted one).</summary>
    private IEnumerable<PoseNameKey> PendingKeys(PoseProposalId? except) =>
        pendingNames.Select(n => PoseName.Create(n).Value!.Key)
            .Concat(Stored.Where(p => p.Status == ProposalStatus.Pending && p.Id != except).Select(p => p.Pose.Name.Key));
}

/// <summary>Fake of <see cref="ICatalogPublisher"/>: records the publications, or refuses them with an error.</summary>
internal sealed class FakeCatalogPublisher(Error? refusal = null) : ReservationAwareFake, ICatalogPublisher
{
    public List<(PoseProposalId Source, RetainedPose Pose)> Published { get; } = [];

    public Task<Result<bool>> PublishPose(PoseProposalId source, RetainedPose pose, CancellationToken ct)
    {
        Called();
        if (refusal is not null) return Task.FromResult<Result<bool>>(refusal);
        Published.Add((source, pose));
        return Task.FromResult(Result<bool>.Success(true));
    }

    public List<(PoseRevisionProposalId Source, PublishedPoseId Pose, PublishedPoseVersion Expected, RetainedPose Retained)> Revised { get; } = [];

    public Task<Result<bool>> RevisePose(
        PoseRevisionProposalId source, PublishedPoseId pose, PublishedPoseVersion expected, RetainedPose retained, CancellationToken ct)
    {
        Called();
        if (refusal is not null) return Task.FromResult<Result<bool>>(refusal);
        Revised.Add((source, pose, expected, retained));
        return Task.FromResult(Result<bool>.Success(true));
    }
}

/// <summary>In-memory fake of <see cref="IPendingPoseProposalsReader"/>: the pending proposals, in no particular order.</summary>
internal sealed class FakePendingPoseProposalsReader(params PoseProposal[] pending) : IPendingPoseProposalsReader
{
    public Task<IReadOnlyList<PoseProposal>> ListPending(CancellationToken ct) =>
        Task.FromResult<IReadOnlyList<PoseProposal>>(pending);

    public Task<int> CountPending(CancellationToken ct) => Task.FromResult(pending.Length);
}

/// <summary>
/// In-memory fake of <see cref="IMyPoseProposalsReader"/>: the proposals of every contributor, in no particular order, and the
/// contributors asked for.
/// </summary>
internal sealed class FakeMyPoseProposalsReader(params PoseProposal[] proposals) : IMyPoseProposalsReader
{
    public List<ContributorId> Calls { get; } = [];

    public Task<IReadOnlyList<PoseProposal>> ListSubmittedBy(ContributorId contributor, CancellationToken ct)
    {
        Calls.Add(contributor);
        return Task.FromResult<IReadOnlyList<PoseProposal>>([.. proposals.Where(p => p.Contributor == contributor)]);
    }
}

/// <summary>In-memory fake of <see cref="IContributorEmails"/>: the addresses of the existing accounts, and the calls received.</summary>
internal sealed class FakeContributorEmails(params (ContributorId Contributor, string Email)[] emails) : IContributorEmails
{
    public List<IReadOnlyCollection<ContributorId>> Calls { get; } = [];

    public Task<IReadOnlyDictionary<ContributorId, string>> Of(IReadOnlyCollection<ContributorId> contributors, CancellationToken ct)
    {
        Calls.Add(contributors);
        return Task.FromResult<IReadOnlyDictionary<ContributorId, string>>(
            emails.Where(e => contributors.Contains(e.Contributor)).ToDictionary(e => e.Contributor, e => e.Email));
    }
}

/// <summary>In-memory fake of <see cref="IValidators"/>.</summary>
internal sealed class FakeValidators(params Validator[] validators) : IValidators
{
    public Task<Validator?> Find(ValidatorId id, CancellationToken ct) =>
        Task.FromResult(validators.SingleOrDefault(v => v.Id == id));
}

/// <summary>In-memory fake of <see cref="ICatalogPoses"/>: the published poses as Contribution reads them.</summary>
internal sealed class FakeCatalogPoses(params PublishedPose[] poses) : ReservationAwareFake, ICatalogPoses
{
    public Task<Result<PublishedPose>> Find(PublishedPoseId id, CancellationToken ct)
    {
        Called();
        return Task.FromResult(poses.SingleOrDefault(p => p.Id == id) is { } pose
            ? Result<PublishedPose>.Success(pose)
            : (Result<PublishedPose>)ContributionErrors.PoseNotFound);
    }
}

/// <summary>In-memory fake of <see cref="IPoseRevisionProposalRepository"/>.</summary>
internal sealed class FakePoseRevisionProposalRepository : IPoseRevisionProposalRepository
{
    public List<PoseRevisionProposal> Added { get; } = [];

    /// <summary>The revision proposals already stored, found by <see cref="GetById"/>.</summary>
    public List<PoseRevisionProposal> Stored { get; } = [];

    public List<PoseRevisionProposal> Updated { get; } = [];

    public void Update(PoseRevisionProposal proposal) => Updated.Add(proposal);

    /// <summary>Names reserved by pending revisions stored before the test.</summary>
    public List<string> PendingReservedNames { get; } = [];

    /// <summary>Poses with a pending revision stored before the test.</summary>
    public List<PublishedPoseId> PosesWithPendingRevision { get; } = [];

    public Task<bool> ExistsPendingForPose(PublishedPoseId pose, CancellationToken ct) =>
        Task.FromResult(PosesWithPendingRevision.Contains(pose) || Added.Any(p => p.Status == ProposalStatus.Pending && p.Pose == pose));

    public Task<PoseRevisionProposal?> GetPendingForPose(PublishedPoseId pose, CancellationToken ct) =>
        Task.FromResult(Stored.Concat(Added).FirstOrDefault(p => p.Status == ProposalStatus.Pending && p.Pose == pose));

    public void Add(PoseRevisionProposal proposal) => Added.Add(proposal);

    public Task<bool> ExistsOtherPendingWithReservedNameKey(PoseNameKey key, PoseRevisionProposalId except, CancellationToken ct) =>
        Task.FromResult(
            PendingReservedNames.Any(n => PoseName.Create(n).Value!.Key == key)
            || Added.Concat(Stored).Any(p => p.Id != except && p.Status == ProposalStatus.Pending && p.Revision.ReservedNameKey == key));

    public Task<bool> ExistsPendingWithReservedNameKey(PoseNameKey key, CancellationToken ct) =>
        Task.FromResult(
            PendingReservedNames.Any(n => PoseName.Create(n).Value!.Key == key)
            || Added.Any(p => p.Status == ProposalStatus.Pending && p.Revision.ReservedNameKey == key));

    public Task<PoseRevisionProposal?> GetById(PoseRevisionProposalId id, CancellationToken ct) =>
        Task.FromResult(Added.Concat(Stored).SingleOrDefault(p => p.Id == id));
}

/// <summary>In-memory fake of <see cref="IPendingPoseRevisionsReader"/>: the pending revisions, in no particular order.</summary>
internal sealed class FakePendingPoseRevisionsReader(params PoseRevisionProposal[] pending) : IPendingPoseRevisionsReader
{
    /// <summary>The number of pending revisions, when it differs from the listed ones (counting only).</summary>
    public int? Count { get; init; }

    public Task<IReadOnlyList<PoseRevisionProposal>> ListPending(CancellationToken ct) =>
        Task.FromResult<IReadOnlyList<PoseRevisionProposal>>(pending);

    public Task<int> CountPending(CancellationToken ct) => Task.FromResult(Count ?? pending.Length);
}

/// <summary>In-memory fake of <see cref="IMyPoseRevisionsReader"/>: the revision proposals of every contributor.</summary>
internal sealed class FakeMyPoseRevisionsReader(params PoseRevisionProposal[] revisions) : IMyPoseRevisionsReader
{
    public Task<IReadOnlyList<PoseRevisionProposal>> ListSubmittedBy(ContributorId contributor, CancellationToken ct) =>
        Task.FromResult<IReadOnlyList<PoseRevisionProposal>>([.. revisions.Where(r => r.Contributor == contributor)]);
}
