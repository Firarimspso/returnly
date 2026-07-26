using Returnly.Api.DTOs;

namespace Returnly.Api.Interfaces;

public interface IPointTransactionService
{
    Task<PagedResponse<PointTransactionDto>> GetPagedAsync(
        PointTransactionQueryParameters query,
        CancellationToken cancellationToken = default);
    Task<PointTransactionDto?> GetByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default);
    Task<PointTransactionDto> EarnAsync(
        CreatePointTransactionRequest request,
        CancellationToken cancellationToken = default);
    Task<PointTransactionDto> RedeemAsync(
        CreatePointTransactionRequest request,
        CancellationToken cancellationToken = default);
}
