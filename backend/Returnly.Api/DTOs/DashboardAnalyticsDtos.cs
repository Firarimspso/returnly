using Returnly.Api.Entities;

namespace Returnly.Api.DTOs;

public enum DashboardPeriod
{
    Today,
    Last7Days,
    Last30Days,
    AllTime,
}

public sealed record DashboardAnalyticsDto(
    string RestaurantName,
    int TotalCustomers,
    int ActiveRewards,
    long OutstandingPoints,
    long LifetimePointsIssued,
    int RewardsRedeemed,
    IReadOnlyList<DashboardActivityPointDto> ActivityTrend,
    IReadOnlyList<DashboardRedemptionDto> RedemptionBreakdown,
    IReadOnlyList<DashboardRecentActivityDto> RecentActivity,
    IReadOnlyList<DashboardTopRewardDto> TopRewards);

public sealed record DashboardActivityPointDto(
    DateOnly Date,
    int Count);

public sealed record DashboardRedemptionDto(
    string Name,
    int Count,
    decimal Percentage);

public sealed record DashboardRecentActivityDto(
    Guid Id,
    Guid CustomerId,
    string CustomerName,
    PointTransactionType Type,
    int Points,
    string Reason,
    DateTimeOffset CreatedAt);

public sealed record DashboardTopRewardDto(
    Guid Id,
    string Name,
    int RequiredPoints,
    string? Icon,
    int Redemptions);
