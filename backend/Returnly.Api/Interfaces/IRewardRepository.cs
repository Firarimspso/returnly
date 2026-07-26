using Returnly.Api.Entities;

namespace Returnly.Api.Interfaces;

public interface IRewardRepository
{
    Task<(IReadOnlyList<Reward> Items, int TotalCount)> GetPagedAsync(
        Guid restaurantId,
        int page,
        int pageSize,
        string? search,
        bool? isActive,
        RewardCategory? category,
        CancellationToken cancellationToken = default);
    Task<Reward?> GetByIdAsync(
        Guid restaurantId,
        Guid rewardId,
        CancellationToken cancellationToken = default);
    Task<bool> NameExistsAsync(
        Guid restaurantId,
        string name,
        Guid? excludingRewardId = null,
        CancellationToken cancellationToken = default);
    Task AddAsync(Reward reward, CancellationToken cancellationToken = default);
    void Remove(Reward reward);
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
