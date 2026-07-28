using Returnly.Api.DTOs;

namespace Returnly.Api.Interfaces;

public interface IPublicQrCodeService
{
    Task<PublicQrCodeDto> ValidateAsync(
        string token,
        CancellationToken cancellationToken = default);
    Task<PublicQrScanResultDto> ScanAsync(
        string token,
        PublicQrScanRequest request,
        CancellationToken cancellationToken = default);
}
