using Microsoft.EntityFrameworkCore;
using Returnly.Api.Data;
using Returnly.Api.Entities;
using Returnly.Api.Interfaces;

namespace Returnly.Api.Repositories;

public sealed class QrCodeRepository(ReturnlyDbContext dbContext) : IQrCodeRepository
{
    public async Task<(IReadOnlyList<QrCode> Items, int TotalCount)> GetPagedAsync(
        Guid restaurantId,
        int page,
        int pageSize,
        string? search,
        bool? isActive,
        QrCodeType? type,
        CancellationToken cancellationToken = default)
    {
        var query = dbContext.QrCodes
            .AsNoTracking()
            .Where(qrCode => qrCode.RestaurantId == restaurantId);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var pattern = $"%{search.Trim()}%";
            query = query.Where(qrCode => EF.Functions.ILike(qrCode.Name, pattern));
        }

        if (isActive.HasValue)
        {
            query = query.Where(qrCode => qrCode.IsActive == isActive.Value);
        }

        if (type.HasValue)
        {
            query = query.Where(qrCode => qrCode.Type == type.Value);
        }

        var totalCount = await query.CountAsync(cancellationToken);
        var items = await query
            .OrderBy(qrCode => qrCode.Name)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);
        return (items, totalCount);
    }

    public Task<QrCode?> GetByIdAsync(
        Guid restaurantId,
        Guid qrCodeId,
        CancellationToken cancellationToken = default) =>
        dbContext.QrCodes.FirstOrDefaultAsync(
            qrCode => qrCode.RestaurantId == restaurantId && qrCode.Id == qrCodeId,
            cancellationToken);

    public Task<QrCode?> GetByTokenAsync(
        Guid restaurantId,
        string token,
        CancellationToken cancellationToken = default) =>
        dbContext.QrCodes.FirstOrDefaultAsync(
            qrCode => qrCode.RestaurantId == restaurantId && qrCode.Token == token,
            cancellationToken);

    public Task<Customer?> GetCustomerAsync(
        Guid restaurantId,
        Guid customerId,
        CancellationToken cancellationToken = default) =>
        dbContext.Customers.FirstOrDefaultAsync(
            customer => customer.RestaurantId == restaurantId && customer.Id == customerId,
            cancellationToken);

    public Task<bool> NameExistsAsync(
        Guid restaurantId,
        string name,
        CancellationToken cancellationToken = default)
    {
        var normalizedName = name.Trim().ToLowerInvariant();
        return dbContext.QrCodes.AnyAsync(
            qrCode => qrCode.RestaurantId == restaurantId
                && qrCode.Name.ToLower() == normalizedName,
            cancellationToken);
    }

    public Task<bool> TokenExistsAsync(
        string token,
        CancellationToken cancellationToken = default) =>
        dbContext.QrCodes.AnyAsync(qrCode => qrCode.Token == token, cancellationToken);

    public Task AddAsync(QrCode qrCode, CancellationToken cancellationToken = default) =>
        dbContext.QrCodes.AddAsync(qrCode, cancellationToken).AsTask();

    public Task AddTransactionAsync(
        PointTransaction transaction,
        CancellationToken cancellationToken = default) =>
        dbContext.PointTransactions.AddAsync(transaction, cancellationToken).AsTask();

    public void Remove(QrCode qrCode) => dbContext.QrCodes.Remove(qrCode);

    public async Task SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        await dbContext.SaveChangesAsync(cancellationToken);
    }
}
