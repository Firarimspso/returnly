using Returnly.Api.DTOs;
using Returnly.Api.Entities;
using Returnly.Api.Interfaces;

namespace Returnly.Api.Services;

public sealed class CustomerService(
    ICustomerRepository customerRepository,
    ICurrentTenant currentTenant) : ICustomerService
{
    public async Task<PagedResponse<CustomerDto>> GetPagedAsync(
        CustomerQueryParameters query,
        CancellationToken cancellationToken = default)
    {
        var (items, totalCount) = await customerRepository.GetPagedAsync(
            GetRestaurantId(), query.Page, query.PageSize, query.Search, cancellationToken);
        var totalPages = totalCount == 0 ? 0 : (int)Math.Ceiling(totalCount / (double)query.PageSize);

        return new PagedResponse<CustomerDto>(
            items.Select(ToDto).ToArray(),
            query.Page,
            query.PageSize,
            totalCount,
            totalPages);
    }

    public async Task<CustomerDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var customer = await customerRepository.GetByIdAsync(GetRestaurantId(), id, cancellationToken);
        return customer is null ? null : ToDto(customer);
    }

    public async Task<CustomerDto> CreateAsync(
        CreateCustomerRequest request,
        CancellationToken cancellationToken = default)
    {
        var restaurantId = GetRestaurantId();
        await EnsureEmailAvailableAsync(restaurantId, request.Email, null, cancellationToken);

        var customer = new Customer
        {
            RestaurantId = restaurantId,
            FirstName = request.FirstName.Trim(),
            LastName = request.LastName.Trim(),
            Email = request.Email.Trim().ToLowerInvariant(),
            PhoneNumber = request.PhoneNumber.Trim(),
            Birthday = request.Birthday,
            Status = request.Status,
        };

        await customerRepository.AddAsync(customer, cancellationToken);
        await customerRepository.SaveChangesAsync(cancellationToken);
        return ToDto(customer);
    }

    public async Task<CustomerDto?> UpdateAsync(
        Guid id,
        UpdateCustomerRequest request,
        CancellationToken cancellationToken = default)
    {
        var restaurantId = GetRestaurantId();
        var customer = await customerRepository.GetByIdAsync(restaurantId, id, cancellationToken);
        if (customer is null)
        {
            return null;
        }

        await EnsureEmailAvailableAsync(restaurantId, request.Email, id, cancellationToken);
        customer.FirstName = request.FirstName.Trim();
        customer.LastName = request.LastName.Trim();
        customer.Email = request.Email.Trim().ToLowerInvariant();
        customer.PhoneNumber = request.PhoneNumber.Trim();
        customer.Birthday = request.Birthday;
        customer.Status = request.Status;

        await customerRepository.SaveChangesAsync(cancellationToken);
        return ToDto(customer);
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var customer = await customerRepository.GetByIdAsync(GetRestaurantId(), id, cancellationToken);
        if (customer is null)
        {
            return false;
        }

        customerRepository.Remove(customer);
        await customerRepository.SaveChangesAsync(cancellationToken);
        return true;
    }

    private Guid GetRestaurantId() =>
        currentTenant.RestaurantId
        ?? throw new UnauthorizedAccessException("The token does not contain a restaurant_id claim.");

    private async Task EnsureEmailAvailableAsync(
        Guid restaurantId,
        string email,
        Guid? excludingCustomerId,
        CancellationToken cancellationToken)
    {
        if (await customerRepository.EmailExistsAsync(
                restaurantId, email, excludingCustomerId, cancellationToken))
        {
            throw new CustomerEmailConflictException();
        }
    }

    private static CustomerDto ToDto(Customer customer) => new(
        customer.Id,
        customer.FirstName,
        customer.LastName,
        $"{customer.FirstName} {customer.LastName}",
        customer.Email,
        customer.PhoneNumber,
        customer.Birthday,
        customer.Status,
        customer.CurrentPoints,
        customer.LifetimePoints,
        customer.TotalVisits,
        customer.LastVisitAt,
        customer.FavoriteReward,
        customer.RewardsRedeemed,
        customer.CreatedAt,
        customer.UpdatedAt);
}

public sealed class CustomerEmailConflictException : Exception
{
    public CustomerEmailConflictException()
        : base("A customer with this email address already exists for the restaurant.")
    {
    }
}
