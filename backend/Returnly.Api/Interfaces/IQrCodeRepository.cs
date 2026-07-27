using Returnly.Api.Entities;

namespace Returnly.Api.Interfaces;

public interface IQrCodeRepository
{
    Task<(IReadOnlyList<QrCode> Items, int TotalCount)> GetPagedAsync(
        Guid restaurantId,
        int page,
        int pageSize,
        string? search,
        bool? isActive,
        QrCodeType? type,
        CancellationToken cancellationToken = default);
    Task<QrCode?> GetByIdAsync(
        Guid restaurantId,
        Guid qrCodeId,
        CancellationToken cancellationToken = default);
    Task<QrCode?> GetByTokenAsync(
        Guid restaurantId,
        string token,
        CancellationToken cancellationToken = default);
    Task<Customer?> GetCustomerAsync(
        Guid restaurantId,
        Guid customerId,
        CancellationToken cancellationToken = default);
    Task<bool> NameExistsAsync(
        Guid restaurantId,
        string name,
        CancellationToken cancellationToken = default);
    Task<bool> TokenExistsAsync(string token, CancellationToken cancellationToken = default);
    Task AddAsync(QrCode qrCode, CancellationToken cancellationToken = default);
    Task AddTransactionAsync(
        PointTransaction transaction,
        CancellationToken cancellationToken = default);
    void Remove(QrCode qrCode);
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
