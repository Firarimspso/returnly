using Microsoft.EntityFrameworkCore;
using Returnly.Api.Data;
using Returnly.Api.Entities;
using Returnly.Api.Interfaces;

namespace Returnly.Api.Repositories;

public sealed class CustomerPortalRepository(ReturnlyDbContext dbContext)
    : ICustomerPortalRepository
{
    public Task<Customer?> GetCustomerAsync(
        Guid restaurantId,
        Guid customerId,
        CancellationToken cancellationToken = default) =>
        dbContext.Customers
            .Include(customer => customer.Restaurant)
            .FirstOrDefaultAsync(
                customer => customer.RestaurantId == restaurantId
                    && customer.Id == customerId,
                cancellationToken);

    public async Task<IReadOnlyList<Reward>> GetActiveRewardsAsync(
        Guid restaurantId,
        CancellationToken cancellationToken = default) =>
        await dbContext.Rewards
            .AsNoTracking()
            .Where(reward => reward.RestaurantId == restaurantId && reward.IsActive)
            .OrderBy(reward => reward.RequiredPoints)
            .ThenBy(reward => reward.Name)
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<PointTransaction>> GetTransactionsAsync(
        Guid restaurantId,
        Guid customerId,
        CancellationToken cancellationToken = default) =>
        await dbContext.PointTransactions
            .AsNoTracking()
            .Where(transaction => transaction.RestaurantId == restaurantId
                && transaction.CustomerId == customerId)
            .OrderByDescending(transaction => transaction.CreatedAt)
            .Take(30)
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<RedemptionRequest>> GetRedemptionsAsync(
        Guid restaurantId,
        Guid customerId,
        CancellationToken cancellationToken = default) =>
        await dbContext.RedemptionRequests
            .AsNoTracking()
            .Include(request => request.Reward)
            .Where(request => request.RestaurantId == restaurantId
                && request.CustomerId == customerId)
            .OrderByDescending(request => request.CreatedAt)
            .Take(20)
            .ToListAsync(cancellationToken);

    public async Task<(IReadOnlyList<RedemptionRequest> Items, int TotalCount)> GetAdminRedemptionsAsync(
        Guid restaurantId,
        int page,
        int pageSize,
        string? search,
        RedemptionRequestStatus? status,
        CancellationToken cancellationToken = default)
    {
        var now = DateTimeOffset.UtcNow;
        var query = dbContext.RedemptionRequests
            .AsNoTracking()
            .Include(request => request.Customer)
            .Include(request => request.Reward)
            .Where(request => request.RestaurantId == restaurantId);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = $"%{search.Trim()}%";
            query = query.Where(request =>
                EF.Functions.ILike(request.Customer.FirstName + " " + request.Customer.LastName, term)
                || EF.Functions.ILike(request.Customer.Email, term)
                || EF.Functions.ILike(request.Reward.Name, term)
                || EF.Functions.ILike(request.ConfirmationCode, term));
        }

        query = status switch
        {
            RedemptionRequestStatus.Pending => query.Where(request =>
                request.Status == RedemptionRequestStatus.Pending && request.ExpiresAt > now),
            RedemptionRequestStatus.Expired => query.Where(request =>
                request.Status == RedemptionRequestStatus.Expired
                || (request.Status == RedemptionRequestStatus.Pending && request.ExpiresAt <= now)),
            not null => query.Where(request => request.Status == status),
            _ => query,
        };

        var totalCount = await query.CountAsync(cancellationToken);
        var items = await query
            .OrderBy(request =>
                request.Status == RedemptionRequestStatus.Pending && request.ExpiresAt > now ? 0 : 1)
            .ThenByDescending(request => request.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);
        return (items, totalCount);
    }

    public Task<Reward?> GetRewardAsync(
        Guid restaurantId,
        Guid rewardId,
        CancellationToken cancellationToken = default) =>
        dbContext.Rewards.FirstOrDefaultAsync(
            reward => reward.RestaurantId == restaurantId
                && reward.Id == rewardId
                && reward.IsActive,
            cancellationToken);

    public Task<RedemptionRequest?> GetPendingRequestAsync(
        Guid restaurantId,
        Guid customerId,
        Guid rewardId,
        CancellationToken cancellationToken = default) =>
        dbContext.RedemptionRequests
            .Include(request => request.Reward)
            .FirstOrDefaultAsync(
                request => request.RestaurantId == restaurantId
                    && request.CustomerId == customerId
                    && request.RewardId == rewardId
                    && request.Status == RedemptionRequestStatus.Pending
                    && request.ExpiresAt > DateTimeOffset.UtcNow,
                cancellationToken);

    public Task<RedemptionRequest?> GetByCodeAsync(
        Guid restaurantId,
        string confirmationCode,
        CancellationToken cancellationToken = default) =>
        dbContext.RedemptionRequests
            .Include(request => request.Customer)
            .Include(request => request.Reward)
            .FirstOrDefaultAsync(
                request => request.RestaurantId == restaurantId
                    && request.ConfirmationCode == confirmationCode,
                cancellationToken);

    public Task<bool> CodeExistsAsync(
        string confirmationCode,
        CancellationToken cancellationToken = default) =>
        dbContext.RedemptionRequests.AnyAsync(
            request => request.ConfirmationCode == confirmationCode,
            cancellationToken);

    public Task AddRequestAsync(
        RedemptionRequest request,
        CancellationToken cancellationToken = default) =>
        dbContext.RedemptionRequests.AddAsync(request, cancellationToken).AsTask();

    public Task AddTransactionAsync(
        PointTransaction transaction,
        CancellationToken cancellationToken = default) =>
        dbContext.PointTransactions.AddAsync(transaction, cancellationToken).AsTask();

    public async Task SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        await dbContext.SaveChangesAsync(cancellationToken);
    }
}
