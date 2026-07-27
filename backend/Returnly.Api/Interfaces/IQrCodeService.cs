using Returnly.Api.DTOs;

namespace Returnly.Api.Interfaces;

public interface IQrCodeService
{
    Task<PagedResponse<QrCodeDto>> GetPagedAsync(
        QrCodeQueryParameters query,
        CancellationToken cancellationToken = default);
    Task<QrCodeDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<QrCodeDto> CreateAsync(
        CreateQrCodeRequest request,
        CancellationToken cancellationToken = default);
    Task<QrCodeDto?> SetStatusAsync(
        Guid id,
        SetQrCodeStatusRequest request,
        CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
    Task<QrCodeScanResultDto> ScanAsync(
        ScanQrCodeRequest request,
        CancellationToken cancellationToken = default);
}
