using Returnly.Api.DTOs;

namespace Returnly.Api.Interfaces;

public interface IQrCodeScanProcessor
{
    Task<QrCodeScanResultDto> ScanForCustomerAsync(
        Guid restaurantId,
        string token,
        Guid customerId,
        CancellationToken cancellationToken = default);
    Task<PublicQrCodeDto> ValidatePublicAsync(
        string token,
        CancellationToken cancellationToken = default);
    Task<PublicQrScanResultDto> ScanPublicAsync(
        string token,
        string identifier,
        CancellationToken cancellationToken = default);
    Task<PublicQrScanResultDto> ScanAuthenticatedPublicAsync(
        Guid restaurantId,
        string token,
        Guid customerId,
        CancellationToken cancellationToken = default);
}
