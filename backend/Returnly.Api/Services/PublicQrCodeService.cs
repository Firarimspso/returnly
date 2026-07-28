using Returnly.Api.DTOs;
using Returnly.Api.Interfaces;

namespace Returnly.Api.Services;

public sealed class PublicQrCodeService(IQrCodeScanProcessor qrCodeScanProcessor)
    : IPublicQrCodeService
{
    public Task<PublicQrCodeDto> ValidateAsync(
        string token,
        CancellationToken cancellationToken = default) =>
        qrCodeScanProcessor.ValidatePublicAsync(token, cancellationToken);

    public Task<PublicQrScanResultDto> ScanAsync(
        string token,
        PublicQrScanRequest request,
        CancellationToken cancellationToken = default) =>
        qrCodeScanProcessor.ScanPublicAsync(
            token, request.Identifier.Trim(), cancellationToken);
}
