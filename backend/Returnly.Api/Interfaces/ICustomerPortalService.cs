using Returnly.Api.DTOs;

namespace Returnly.Api.Interfaces;

public interface ICustomerPortalService
{
    Task<CustomerPortalDto> GetAsync(CancellationToken cancellationToken = default);
    Task<PagedResponse<AdminRedemptionRequestDto>> GetAdminRedemptionsAsync(
        Guid restaurantId,
        RedemptionRequestQueryParameters query,
        CancellationToken cancellationToken = default);
    Task<RedemptionRequestDto> RequestRedemptionAsync(CreateRedemptionRequest request, CancellationToken cancellationToken = default);
    Task<ConfirmedRedemptionDto> ConfirmAsync(Guid restaurantId, Guid userId, ConfirmRedemptionRequest request, CancellationToken cancellationToken = default);
}
