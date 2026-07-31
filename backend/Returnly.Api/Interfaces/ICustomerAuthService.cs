using Returnly.Api.DTOs;

namespace Returnly.Api.Interfaces;

public interface ICustomerAuthService
{
    Task<CustomerVerificationChallengeDto> RequestCodeAsync(
        RequestCustomerVerificationCode request,
        CancellationToken cancellationToken = default);
    Task<CustomerVerificationChallengeDto> ResendCodeAsync(
        ResendCustomerCodeRequest request,
        CancellationToken cancellationToken = default);
    Task<CustomerVerificationResultDto> VerifyCodeAsync(
        VerifyCustomerCodeRequest request,
        CancellationToken cancellationToken = default);
    Task<CustomerVerificationResultDto> TrustedScanAsync(
        Guid restaurantId,
        Guid customerId,
        TrustedCustomerScanRequest request,
        CancellationToken cancellationToken = default);
}
