using Returnly.Api.DTOs;
using Returnly.Api.Entities;
using Returnly.Api.Interfaces;

namespace Returnly.Api.Services;

public sealed class DashboardAnalyticsService(
    IDashboardAnalyticsRepository dashboardAnalyticsRepository,
    ICurrentTenant currentTenant) : IDashboardAnalyticsService
{
    public async Task<DashboardAnalyticsDto> GetAsync(
        DashboardPeriod period,
        CancellationToken cancellationToken = default)
    {
        var now = DateTimeOffset.UtcNow;
        var today = DateOnly.FromDateTime(now.UtcDateTime);
        var (from, to) = ResolvePeriod(period, today, now);
        var snapshot = await dashboardAnalyticsRepository.GetAsync(
            GetRestaurantId(), from, to, cancellationToken);

        var activityCounts = snapshot.ActivityDates
            .GroupBy(date => DateOnly.FromDateTime(date.UtcDateTime))
            .ToDictionary(group => group.Key, group => group.Count());
        var activityTrend = BuildActivityTrend(period, today, from, activityCounts);

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
                    ?? 0))
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

    private static (DateTimeOffset? From, DateTimeOffset? To) ResolvePeriod(
        DashboardPeriod period,
        DateOnly today,
        DateTimeOffset now)
    {
        if (period == DashboardPeriod.AllTime) return (null, null);
        var startDate = period switch
        {
            DashboardPeriod.Today => today,
            DashboardPeriod.Last7Days => today.AddDays(-6),
            _ => today.AddDays(-29),
        };
        return (
            new DateTimeOffset(startDate.ToDateTime(TimeOnly.MinValue), TimeSpan.Zero),
            now);
    }

    private static IReadOnlyList<DashboardActivityPointDto> BuildActivityTrend(
        DashboardPeriod period,
        DateOnly today,
        DateTimeOffset? from,
        IReadOnlyDictionary<DateOnly, int> counts)
    {
        if (period == DashboardPeriod.AllTime)
        {
            return counts
                .OrderBy(item => item.Key)
                .Select(item => new DashboardActivityPointDto(item.Key, item.Value))
                .ToArray();
        }

        var firstDay = from.HasValue
            ? DateOnly.FromDateTime(from.Value.UtcDateTime)
            : today;
        var days = today.DayNumber - firstDay.DayNumber + 1;
        return Enumerable.Range(0, days)
            .Select(offset =>
            {
                var date = firstDay.AddDays(offset);
                return new DashboardActivityPointDto(date, counts.GetValueOrDefault(date));
            })
            .ToArray();
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
