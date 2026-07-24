using Microsoft.EntityFrameworkCore;
using Returnly.Api.Data;
using Returnly.Api.Entities;
using Returnly.Api.Interfaces;

namespace Returnly.Api.Repositories;

public sealed class CustomerRepository(ReturnlyDbContext dbContext) : ICustomerRepository
{
    public async Task<(IReadOnlyList<Customer> Items, int TotalCount)> GetPagedAsync(
        Guid restaurantId,
        int page,
        int pageSize,
        string? search,
        CancellationToken cancellationToken = default)
    {
        var query = dbContext.Customers
            .AsNoTracking()
            .Where(customer => customer.RestaurantId == restaurantId);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var pattern = $"%{search.Trim()}%";
            query = query.Where(customer =>
                EF.Functions.ILike(customer.FirstName + " " + customer.LastName, pattern)
                || EF.Functions.ILike(customer.FirstName, pattern)
                || EF.Functions.ILike(customer.LastName, pattern)
                || EF.Functions.ILike(customer.PhoneNumber, pattern)
                || EF.Functions.ILike(customer.Email, pattern));
        }

        var totalCount = await query.CountAsync(cancellationToken);
        var items = await query
            .OrderBy(customer => customer.FirstName)
            .ThenBy(customer => customer.LastName)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return (items, totalCount);
    }

    public Task<Customer?> GetByIdAsync(
        Guid restaurantId,
        Guid customerId,
        CancellationToken cancellationToken = default) =>
        dbContext.Customers.FirstOrDefaultAsync(
            customer => customer.RestaurantId == restaurantId && customer.Id == customerId,
            cancellationToken);

    public Task<bool> EmailExistsAsync(
        Guid restaurantId,
        string email,
        Guid? excludingCustomerId = null,
        CancellationToken cancellationToken = default)
    {
        var normalizedEmail = email.Trim().ToLowerInvariant();
        return dbContext.Customers.AnyAsync(
            customer => customer.RestaurantId == restaurantId
                && customer.Email.ToLower() == normalizedEmail
                && (!excludingCustomerId.HasValue || customer.Id != excludingCustomerId.Value),
            cancellationToken);
    }

    public Task AddAsync(Customer customer, CancellationToken cancellationToken = default) =>
        dbContext.Customers.AddAsync(customer, cancellationToken).AsTask();

    public void Remove(Customer customer) => dbContext.Customers.Remove(customer);

    public async Task SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        await dbContext.SaveChangesAsync(cancellationToken);
    }
}
