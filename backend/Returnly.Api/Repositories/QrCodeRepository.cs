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
        dbContext.QrCodes
            .Include(qrCode => qrCode.Restaurant)
            .FirstOrDefaultAsync(
            qrCode => qrCode.RestaurantId == restaurantId && qrCode.Token == token,
            cancellationToken);

    public Task<QrCode?> GetPublicByTokenAsync(
        string token,
        CancellationToken cancellationToken = default) =>
        dbContext.QrCodes
            .Include(qrCode => qrCode.Restaurant)
            .FirstOrDefaultAsync(qrCode => qrCode.Token == token, cancellationToken);

    public Task<Customer?> GetCustomerAsync(
        Guid restaurantId,
        Guid customerId,
        CancellationToken cancellationToken = default) =>
        dbContext.Customers.FirstOrDefaultAsync(
            customer => customer.RestaurantId == restaurantId && customer.Id == customerId,
            cancellationToken);

    public async Task<Customer?> GetCustomerByIdentifierAsync(
        Guid restaurantId,
        string identifier,
        CancellationToken cancellationToken = default)
    {
        var normalizedIdentifier = identifier.Trim().ToLowerInvariant();
        if (normalizedIdentifier.Contains('@'))
        {
            return await dbContext.Customers.FirstOrDefaultAsync(
                customer => customer.RestaurantId == restaurantId
                    && customer.Email.ToLower() == normalizedIdentifier,
                cancellationToken);
        }

        var normalizedPhone = NormalizePhone(identifier);
        if (normalizedPhone.Length < 7)
        {
            return null;
        }

        var pattern = $"%{string.Join('%', normalizedPhone.ToCharArray())}%";
        var candidates = await dbContext.Customers
            .Where(customer => customer.RestaurantId == restaurantId
                && EF.Functions.ILike(customer.PhoneNumber, pattern))
            .Take(10)
            .ToListAsync(cancellationToken);
        return candidates.FirstOrDefault(
            customer => NormalizePhone(customer.PhoneNumber) == normalizedPhone);
    }

    public Task<bool> ScanExistsAsync(
        Guid qrCodeId,
        Guid customerId,
        DateOnly scanDate,
        CancellationToken cancellationToken = default) =>
        dbContext.QrCodeScans.AnyAsync(
            scan => scan.QrCodeId == qrCodeId
                && scan.CustomerId == customerId
                && scan.ScanDate == scanDate,
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

    public Task AddScanAsync(
        QrCodeScan scan,
        CancellationToken cancellationToken = default) =>
        dbContext.QrCodeScans.AddAsync(scan, cancellationToken).AsTask();

    public void Remove(QrCode qrCode) => dbContext.QrCodes.Remove(qrCode);

    public async Task SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        await dbContext.SaveChangesAsync(cancellationToken);
    }

    private static string NormalizePhone(string value) =>
        new(value.Where(char.IsDigit).ToArray());
}
