using Microsoft.EntityFrameworkCore;
using Returnly.Api.Data;
using Returnly.Api.Entities;
using Returnly.Api.Interfaces;

namespace Returnly.Api.Repositories;

public sealed class PointTransactionRepository(ReturnlyDbContext dbContext)
    : IPointTransactionRepository
{
    public async Task<(IReadOnlyList<PointTransaction> Items, int TotalCount)> GetPagedAsync(
        Guid restaurantId,
        int page,
        int pageSize,
        Guid? customerId,
        PointTransactionType? type,
        string? search,
        CancellationToken cancellationToken = default)
    {
        var query = dbContext.PointTransactions
            .AsNoTracking()
            .Include(transaction => transaction.Customer)
            .Where(transaction => transaction.RestaurantId == restaurantId);

        if (customerId.HasValue)
        {
            query = query.Where(transaction => transaction.CustomerId == customerId.Value);
        }

        if (type.HasValue)
        {
            query = query.Where(transaction => transaction.Type == type.Value);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var pattern = $"%{search.Trim()}%";
            query = query.Where(transaction =>
                EF.Functions.ILike(transaction.Reason, pattern)
                || EF.Functions.ILike(
                    transaction.Customer.FirstName + " " + transaction.Customer.LastName,
                    pattern));
        }

        var totalCount = await query.CountAsync(cancellationToken);
        var items = await query
            .OrderByDescending(transaction => transaction.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return (items, totalCount);
    }

    public Task<PointTransaction?> GetByIdAsync(
        Guid restaurantId,
        Guid transactionId,
        CancellationToken cancellationToken = default) =>
        dbContext.PointTransactions
            .AsNoTracking()
            .Include(transaction => transaction.Customer)
            .FirstOrDefaultAsync(
                transaction => transaction.RestaurantId == restaurantId
                    && transaction.Id == transactionId,
                cancellationToken);

    public Task<Customer?> GetCustomerAsync(
        Guid restaurantId,
        Guid customerId,
        CancellationToken cancellationToken = default) =>
        dbContext.Customers.FirstOrDefaultAsync(
            customer => customer.RestaurantId == restaurantId && customer.Id == customerId,
            cancellationToken);

    public Task AddAsync(
        PointTransaction transaction,
        CancellationToken cancellationToken = default) =>
        dbContext.PointTransactions.AddAsync(transaction, cancellationToken).AsTask();

    public async Task SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        await dbContext.SaveChangesAsync(cancellationToken);
    }
}
