using Returnly.Api.DTOs;

namespace Returnly.Api.Interfaces;

public interface IRewardService
{
    Task<PagedResponse<RewardDto>> GetPagedAsync(
        RewardQueryParameters query,
        CancellationToken cancellationToken = default);
    Task<RewardDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<RewardDto> CreateAsync(CreateRewardRequest request, CancellationToken cancellationToken = default);
    Task<RewardDto?> UpdateAsync(
        Guid id,
        UpdateRewardRequest request,
        CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
}
