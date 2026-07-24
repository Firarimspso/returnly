using Returnly.Api.Entities;

namespace Returnly.Api.Interfaces;

public interface ICustomerRepository
{
    Task<(IReadOnlyList<Customer> Items, int TotalCount)> GetPagedAsync(
        Guid restaurantId,
        int page,
        int pageSize,
        string? search,
        CancellationToken cancellationToken = default);
    Task<Customer?> GetByIdAsync(
        Guid restaurantId,
        Guid customerId,
        CancellationToken cancellationToken = default);
    Task<bool> EmailExistsAsync(
        Guid restaurantId,
        string email,
        Guid? excludingCustomerId = null,
        CancellationToken cancellationToken = default);
    Task AddAsync(Customer customer, CancellationToken cancellationToken = default);
    void Remove(Customer customer);
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
