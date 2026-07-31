using Returnly.Api.DTOs;

namespace Returnly.Api.Interfaces;

public interface ICustomerLoginService
{
    Task<CustomerVerificationChallengeDto> RequestCodeAsync(
        RequestCustomerLoginCode request, CancellationToken cancellationToken = default);
    Task<CustomerVerificationChallengeDto> ResendCodeAsync(
        ResendCustomerLoginCode request, CancellationToken cancellationToken = default);
    Task<CustomerLoginResultDto> VerifyCodeAsync(
        VerifyCustomerLoginCode request, CancellationToken cancellationToken = default);
    Task<CustomerLoginResultDto> SelectRestaurantAsync(
        SelectCustomerRestaurantRequest request, CancellationToken cancellationToken = default);
}
