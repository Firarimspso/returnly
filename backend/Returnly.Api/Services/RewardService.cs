using Returnly.Api.DTOs;
using Returnly.Api.Entities;
using Returnly.Api.Interfaces;

namespace Returnly.Api.Services;

public sealed class RewardService(
    IRewardRepository rewardRepository,
    ICurrentTenant currentTenant) : IRewardService
{
    public async Task<PagedResponse<RewardDto>> GetPagedAsync(
        RewardQueryParameters query,
        CancellationToken cancellationToken = default)
    {
        var (items, totalCount) = await rewardRepository.GetPagedAsync(
            GetRestaurantId(),
            query.Page,
            query.PageSize,
            query.Search,
            query.IsActive,
            query.Category,
            cancellationToken);
        var totalPages = totalCount == 0 ? 0 : (int)Math.Ceiling(totalCount / (double)query.PageSize);

        return new PagedResponse<RewardDto>(
            items.Select(ToDto).ToArray(),
            query.Page,
            query.PageSize,
            totalCount,
            totalPages);
    }

    public async Task<RewardDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var reward = await rewardRepository.GetByIdAsync(GetRestaurantId(), id, cancellationToken);
        return reward is null ? null : ToDto(reward);
    }

    public async Task<RewardDto> CreateAsync(
        CreateRewardRequest request,
        CancellationToken cancellationToken = default)
    {
        var restaurantId = GetRestaurantId();
        await EnsureNameAvailableAsync(restaurantId, request.Name, null, cancellationToken);

        var reward = new Reward
        {
            RestaurantId = restaurantId,
            Name = request.Name.Trim(),
            Description = request.Description.Trim(),
            RequiredPoints = request.RequiredPoints,
            IsActive = request.IsActive,
            Category = request.Category,
            Icon = NormalizeOptional(request.Icon),
            Color = NormalizeOptional(request.Color),
        };

        await rewardRepository.AddAsync(reward, cancellationToken);
        await rewardRepository.SaveChangesAsync(cancellationToken);
        return ToDto(reward);
    }

    public async Task<RewardDto?> UpdateAsync(
        Guid id,
        UpdateRewardRequest request,
        CancellationToken cancellationToken = default)
    {
        var restaurantId = GetRestaurantId();
        var reward = await rewardRepository.GetByIdAsync(restaurantId, id, cancellationToken);
        if (reward is null)
        {
            return null;
        }

        await EnsureNameAvailableAsync(restaurantId, request.Name, id, cancellationToken);
        reward.Name = request.Name.Trim();
        reward.Description = request.Description.Trim();
        reward.RequiredPoints = request.RequiredPoints;
        reward.IsActive = request.IsActive;
        reward.Category = request.Category;
        reward.Icon = NormalizeOptional(request.Icon);
        reward.Color = NormalizeOptional(request.Color);

        await rewardRepository.SaveChangesAsync(cancellationToken);
        return ToDto(reward);
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var reward = await rewardRepository.GetByIdAsync(GetRestaurantId(), id, cancellationToken);
        if (reward is null)
        {
            return false;
        }

        rewardRepository.Remove(reward);
        await rewardRepository.SaveChangesAsync(cancellationToken);
        return true;
    }

    private Guid GetRestaurantId() =>
        currentTenant.RestaurantId
        ?? throw new UnauthorizedAccessException("The token does not contain a restaurant_id claim.");

    private async Task EnsureNameAvailableAsync(
        Guid restaurantId,
        string name,
        Guid? excludingRewardId,
        CancellationToken cancellationToken)
    {
        if (await rewardRepository.NameExistsAsync(
                restaurantId, name, excludingRewardId, cancellationToken))
        {
            throw new RewardNameConflictException();
        }
    }

    private static string? NormalizeOptional(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static RewardDto ToDto(Reward reward) => new(
        reward.Id,
        reward.Name,
        reward.Description,
        reward.RequiredPoints,
        reward.IsActive,
        reward.Category,
        reward.Icon,
        reward.Color,
        reward.TotalRedemptions,
        reward.CreatedAt,
        reward.UpdatedAt);
}

public sealed class RewardNameConflictException : Exception
{
    public RewardNameConflictException()
        : base("A reward with this name already exists for the restaurant.")
    {
    }
}
