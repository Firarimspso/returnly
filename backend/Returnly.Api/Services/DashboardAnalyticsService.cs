using Returnly.Api.DTOs;
using Returnly.Api.Entities;
using Returnly.Api.Interfaces;

namespace Returnly.Api.Services;

public sealed class DashboardAnalyticsService(
    IDashboardAnalyticsRepository dashboardAnalyticsRepository,
    ICurrentTenant currentTenant) : IDashboardAnalyticsService
{
    private const int ActivityDays = 12;

    public async Task<DashboardAnalyticsDto> GetAsync(
        CancellationToken cancellationToken = default)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var firstDay = today.AddDays(-(ActivityDays - 1));
        var activityFrom = new DateTimeOffset(
            firstDay.ToDateTime(TimeOnly.MinValue),
            TimeSpan.Zero);
        var snapshot = await dashboardAnalyticsRepository.GetAsync(
            GetRestaurantId(), activityFrom, cancellationToken);

        var activityCounts = snapshot.ActivityDates
            .GroupBy(date => DateOnly.FromDateTime(date.UtcDateTime))
            .ToDictionary(group => group.Key, group => group.Count());
        var activityTrend = Enumerable.Range(0, ActivityDays)
            .Select(offset =>
            {
                var date = firstDay.AddDays(offset);
                return new DashboardActivityPointDto(
                    date,
                    activityCounts.GetValueOrDefault(date));
            })
            .ToArray();

        var redemptions = BuildRedemptionCounts(snapshot);
        var totalRedemptions = redemptions.Sum(item => item.Count);
        var redemptionBreakdown = redemptions
            .OrderByDescending(item => item.Count)
            .ThenBy(item => item.Name)
            .Take(4)
            .Select(item => new DashboardRedemptionDto(
                item.Name,
                item.Count,
                totalRedemptions == 0
                    ? 0
                    : Math.Round(item.Count * 100m / totalRedemptions, 1)))
            .ToArray();

        var topRewards = snapshot.Rewards
            .Select(reward => new DashboardTopRewardDto(
                reward.Id,
                reward.Name,
                reward.RequiredPoints,
                reward.Icon,
                redemptions
                    .FirstOrDefault(item => item.RewardId == reward.Id)?.Count
                    ?? reward.TotalRedemptions))
            .OrderByDescending(reward => reward.Redemptions)
            .ThenBy(reward => reward.Name)
            .Take(3)
            .ToArray();

        var recentActivity = snapshot.RecentActivity
            .Select(transaction => new DashboardRecentActivityDto(
                transaction.Id,
                transaction.CustomerId,
                $"{transaction.Customer.FirstName} {transaction.Customer.LastName}",
                transaction.Type,
                transaction.Points,
                transaction.Reason,
                transaction.CreatedAt))
            .ToArray();

        return new DashboardAnalyticsDto(
            snapshot.RestaurantName,
            snapshot.TotalCustomers,
            snapshot.ActiveRewards,
            snapshot.OutstandingPoints,
            snapshot.LifetimePointsIssued,
            totalRedemptions,
            activityTrend,
            redemptionBreakdown,
            recentActivity,
            topRewards);
    }

    private static IReadOnlyList<RewardRedemptionCount> BuildRedemptionCounts(
        DashboardAnalyticsSnapshot snapshot)
    {
        var counts = snapshot.Rewards
            .Select(reward => new RewardRedemptionCount(
                reward.Id,
                reward.Name,
                snapshot.RedemptionReasons
                    .Where(item => item.Reason.Contains(
                        reward.Name,
                        StringComparison.OrdinalIgnoreCase))
                    .Sum(item => item.Count)))
            .Where(item => item.Count > 0)
            .ToList();
        var matchedCount = counts.Sum(item => item.Count);
        var totalCount = snapshot.RedemptionReasons.Sum(item => item.Count);

        if (totalCount > matchedCount)
        {
            counts.Add(new RewardRedemptionCount(null, "Other", totalCount - matchedCount));
        }

        return counts;
    }

    private Guid GetRestaurantId() =>
        currentTenant.RestaurantId
        ?? throw new UnauthorizedAccessException("The token does not contain a restaurant_id claim.");

    private sealed record RewardRedemptionCount(
        Guid? RewardId,
        string Name,
        int Count);
}
