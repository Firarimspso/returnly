using Microsoft.EntityFrameworkCore;
using Returnly.Api.Data;
using Returnly.Api.Entities;
using Returnly.Api.Interfaces;

namespace Returnly.Api.Repositories;

public sealed class RewardRepository(ReturnlyDbContext dbContext) : IRewardRepository
{
    public async Task<(IReadOnlyList<Reward> Items, int TotalCount)> GetPagedAsync(
        Guid restaurantId,
        int page,
        int pageSize,
        string? search,
        bool? isActive,
        RewardCategory? category,
        CancellationToken cancellationToken = default)
    {
        var query = dbContext.Rewards
            .AsNoTracking()
            .Where(reward => reward.RestaurantId == restaurantId);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var pattern = $"%{search.Trim()}%";
            query = query.Where(reward =>
                EF.Functions.ILike(reward.Name, pattern)
                || EF.Functions.ILike(reward.Description, pattern));
        }

        if (isActive.HasValue)
        {
            query = query.Where(reward => reward.IsActive == isActive.Value);
        }

        if (category.HasValue)
        {
            query = query.Where(reward => reward.Category == category.Value);
        }

        var totalCount = await query.CountAsync(cancellationToken);
        var items = await query
            .OrderBy(reward => reward.Name)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return (items, totalCount);
    }

    public Task<Reward?> GetByIdAsync(
        Guid restaurantId,
        Guid rewardId,
        CancellationToken cancellationToken = default) =>
        dbContext.Rewards.FirstOrDefaultAsync(
            reward => reward.RestaurantId == restaurantId && reward.Id == rewardId,
            cancellationToken);

    public Task<bool> NameExistsAsync(
        Guid restaurantId,
        string name,
        Guid? excludingRewardId = null,
        CancellationToken cancellationToken = default)
    {
        var normalizedName = name.Trim().ToLowerInvariant();
        return dbContext.Rewards.AnyAsync(
            reward => reward.RestaurantId == restaurantId
                && reward.Name.ToLower() == normalizedName
                && (!excludingRewardId.HasValue || reward.Id != excludingRewardId.Value),
            cancellationToken);
    }

    public Task AddAsync(Reward reward, CancellationToken cancellationToken = default) =>
        dbContext.Rewards.AddAsync(reward, cancellationToken).AsTask();

    public void Remove(Reward reward) => dbContext.Rewards.Remove(reward);

    public async Task SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        await dbContext.SaveChangesAsync(cancellationToken);
    }
}
