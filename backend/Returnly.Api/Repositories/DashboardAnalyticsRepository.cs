using Microsoft.EntityFrameworkCore;
using Returnly.Api.Data;
using Returnly.Api.Entities;
using Returnly.Api.Interfaces;

namespace Returnly.Api.Repositories;

public sealed class DashboardAnalyticsRepository(ReturnlyDbContext dbContext)
    : IDashboardAnalyticsRepository
{
    public async Task<DashboardAnalyticsSnapshot> GetAsync(
        Guid restaurantId,
        DateTimeOffset? from,
        DateTimeOffset? to,
        CancellationToken cancellationToken = default)
    {
        var restaurantName = await dbContext.Restaurants
            .AsNoTracking()
            .Where(restaurant => restaurant.Id == restaurantId)
            .Select(restaurant => restaurant.Name)
            .SingleAsync(cancellationToken);

        var customers = dbContext.Customers
            .AsNoTracking()
            .Where(customer => customer.RestaurantId == restaurantId);
        if (from.HasValue) customers = customers.Where(customer => customer.CreatedAt >= from.Value);
        if (to.HasValue) customers = customers.Where(customer => customer.CreatedAt < to.Value);
        var totalCustomers = await customers.CountAsync(cancellationToken);

        var rewards = await dbContext.Rewards
            .AsNoTracking()
            .Where(reward => reward.RestaurantId == restaurantId)
            .OrderBy(reward => reward.Name)
            .ToListAsync(cancellationToken);
        var activeRewardsQuery = dbContext.Rewards
            .AsNoTracking()
            .Where(reward => reward.RestaurantId == restaurantId && reward.IsActive);
        if (from.HasValue) activeRewardsQuery = activeRewardsQuery.Where(reward => reward.CreatedAt >= from.Value);
        if (to.HasValue) activeRewardsQuery = activeRewardsQuery.Where(reward => reward.CreatedAt < to.Value);
        var activeRewards = await activeRewardsQuery.CountAsync(cancellationToken);

        var transactions = dbContext.PointTransactions
            .AsNoTracking()
            .Where(transaction => transaction.RestaurantId == restaurantId);
        if (from.HasValue) transactions = transactions.Where(transaction => transaction.CreatedAt >= from.Value);
        if (to.HasValue) transactions = transactions.Where(transaction => transaction.CreatedAt < to.Value);
        var earnedPoints = await transactions
            .Where(transaction => transaction.Type == PointTransactionType.Earn)
            .Select(transaction => (long)transaction.Points)
            .SumAsync(cancellationToken);
        var redeemedPoints = await transactions
            .Where(transaction => transaction.Type == PointTransactionType.Redeem)
            .Select(transaction => (long)transaction.Points)
            .SumAsync(cancellationToken);
        var outstandingPoints = earnedPoints - redeemedPoints;
        var lifetimePointsIssued = earnedPoints;
        var activityDates = await transactions
            .Select(transaction => transaction.CreatedAt)
            .ToListAsync(cancellationToken);
        var recentActivity = await transactions
            .Include(transaction => transaction.Customer)
            .OrderByDescending(transaction => transaction.CreatedAt)
            .Take(5)
            .ToListAsync(cancellationToken);
        var redemptionReasons = await transactions
            .Where(transaction => transaction.Type == PointTransactionType.Redeem)
            .GroupBy(transaction => transaction.Reason)
            .Select(group => new RedemptionReasonCount(group.Key, group.Count()))
            .ToListAsync(cancellationToken);

        return new DashboardAnalyticsSnapshot(
            restaurantName,
            totalCustomers,
            activeRewards,
            outstandingPoints,
            lifetimePointsIssued,
            activityDates,
            recentActivity,
            rewards,
            redemptionReasons);
    }
}
