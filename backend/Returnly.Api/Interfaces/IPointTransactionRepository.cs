using Returnly.Api.Entities;

namespace Returnly.Api.Interfaces;

public interface IPointTransactionRepository
{
    Task<(IReadOnlyList<PointTransaction> Items, int TotalCount)> GetPagedAsync(
        Guid restaurantId,
        int page,
        int pageSize,
        Guid? customerId,
        PointTransactionType? type,
        string? search,
        CancellationToken cancellationToken = default);
    Task<PointTransaction?> GetByIdAsync(
        Guid restaurantId,
        Guid transactionId,
        CancellationToken cancellationToken = default);
    Task<Customer?> GetCustomerAsync(
        Guid restaurantId,
        Guid customerId,
        CancellationToken cancellationToken = default);
    Task AddAsync(PointTransaction transaction, CancellationToken cancellationToken = default);
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
