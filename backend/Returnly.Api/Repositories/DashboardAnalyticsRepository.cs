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
        DateTimeOffset activityFrom,
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
        var totalCustomers = await customers.CountAsync(cancellationToken);
        var outstandingPoints = await customers
            .Select(customer => (long)customer.CurrentPoints)
            .SumAsync(cancellationToken);
        var lifetimePointsIssued = await customers
            .Select(customer => (long)customer.LifetimePoints)
            .SumAsync(cancellationToken);

        var rewards = await dbContext.Rewards
            .AsNoTracking()
            .Where(reward => reward.RestaurantId == restaurantId)
            .OrderBy(reward => reward.Name)
            .ToListAsync(cancellationToken);
        var activeRewards = rewards.Count(reward => reward.IsActive);

        var transactions = dbContext.PointTransactions
            .AsNoTracking()
            .Where(transaction => transaction.RestaurantId == restaurantId);
        var activityDates = await transactions
            .Where(transaction => transaction.CreatedAt >= activityFrom)
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
