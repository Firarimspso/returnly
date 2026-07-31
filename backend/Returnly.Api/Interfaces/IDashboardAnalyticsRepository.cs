using Returnly.Api.Entities;

namespace Returnly.Api.Interfaces;

public interface IDashboardAnalyticsRepository
{
    Task<DashboardAnalyticsSnapshot> GetAsync(
        Guid restaurantId,
        DateTimeOffset? from,
        DateTimeOffset? to,
        CancellationToken cancellationToken = default);
}

public sealed record DashboardAnalyticsSnapshot(
    string RestaurantName,
    int TotalCustomers,
    int ActiveRewards,
    long OutstandingPoints,
    long LifetimePointsIssued,
    IReadOnlyList<DateTimeOffset> ActivityDates,
    IReadOnlyList<PointTransaction> RecentActivity,
    IReadOnlyList<Reward> Rewards,
    IReadOnlyList<RedemptionReasonCount> RedemptionReasons);

public sealed record RedemptionReasonCount(
    string Reason,
    int Count);
