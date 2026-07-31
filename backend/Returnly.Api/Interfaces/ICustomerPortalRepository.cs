using Returnly.Api.Entities;

namespace Returnly.Api.Interfaces;

public interface ICustomerPortalRepository
{
    Task<Customer?> GetCustomerAsync(Guid restaurantId, Guid customerId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Reward>> GetActiveRewardsAsync(Guid restaurantId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<PointTransaction>> GetTransactionsAsync(Guid restaurantId, Guid customerId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<RedemptionRequest>> GetRedemptionsAsync(Guid restaurantId, Guid customerId, CancellationToken cancellationToken = default);
    Task<(IReadOnlyList<RedemptionRequest> Items, int TotalCount)> GetAdminRedemptionsAsync(
        Guid restaurantId,
        int page,
        int pageSize,
        string? search,
        RedemptionRequestStatus? status,
        CancellationToken cancellationToken = default);
    Task<Reward?> GetRewardAsync(Guid restaurantId, Guid rewardId, CancellationToken cancellationToken = default);
    Task<RedemptionRequest?> GetPendingRequestAsync(Guid restaurantId, Guid customerId, Guid rewardId, CancellationToken cancellationToken = default);
    Task<RedemptionRequest?> GetByCodeAsync(Guid restaurantId, string confirmationCode, CancellationToken cancellationToken = default);
    Task<bool> CodeExistsAsync(string confirmationCode, CancellationToken cancellationToken = default);
    Task AddRequestAsync(RedemptionRequest request, CancellationToken cancellationToken = default);
    Task AddTransactionAsync(PointTransaction transaction, CancellationToken cancellationToken = default);
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
