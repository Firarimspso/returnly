using Returnly.Api.DTOs;

namespace Returnly.Api.Interfaces;

public interface ICustomerService
{
    Task<PagedResponse<CustomerDto>> GetPagedAsync(
        CustomerQueryParameters query,
        CancellationToken cancellationToken = default);
    Task<CustomerDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<CustomerDto> CreateAsync(CreateCustomerRequest request, CancellationToken cancellationToken = default);
    Task<CustomerDto?> UpdateAsync(Guid id, UpdateCustomerRequest request, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
}
