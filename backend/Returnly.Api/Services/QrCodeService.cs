using System.Security.Cryptography;
using Returnly.Api.DTOs;
using Returnly.Api.Entities;
using Returnly.Api.Interfaces;

namespace Returnly.Api.Services;

public sealed class QrCodeService(
    IQrCodeRepository qrCodeRepository,
    ICurrentTenant currentTenant) : IQrCodeService
{
    public async Task<PagedResponse<QrCodeDto>> GetPagedAsync(
        QrCodeQueryParameters query,
        CancellationToken cancellationToken = default)
    {
        var (items, totalCount) = await qrCodeRepository.GetPagedAsync(
            GetRestaurantId(),
            query.Page,
            query.PageSize,
            query.Search,
            query.IsActive,
            query.Type,
            cancellationToken);
        var totalPages = totalCount == 0 ? 0 : (int)Math.Ceiling(totalCount / (double)query.PageSize);

        return new PagedResponse<QrCodeDto>(
            items.Select(ToDto).ToArray(),
            query.Page,
            query.PageSize,
            totalCount,
            totalPages);
    }

    public async Task<QrCodeDto?> GetByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var qrCode = await qrCodeRepository.GetByIdAsync(
            GetRestaurantId(), id, cancellationToken);
        return qrCode is null ? null : ToDto(qrCode);
    }

    public async Task<QrCodeDto> CreateAsync(
        CreateQrCodeRequest request,
        CancellationToken cancellationToken = default)
    {
        var restaurantId = GetRestaurantId();
        if (await qrCodeRepository.NameExistsAsync(
                restaurantId, request.Name, cancellationToken))
        {
            throw new QrCodeNameConflictException();
        }

        var qrCode = new QrCode
        {
            RestaurantId = restaurantId,
            Name = request.Name.Trim(),
            Type = request.Type,
            Token = await GenerateUniqueTokenAsync(cancellationToken),
            PointsPerScan = request.PointsPerScan,
            IsActive = request.IsActive,
        };

        await qrCodeRepository.AddAsync(qrCode, cancellationToken);
        await qrCodeRepository.SaveChangesAsync(cancellationToken);
        return ToDto(qrCode);
    }

    public async Task<QrCodeDto?> SetStatusAsync(
        Guid id,
        SetQrCodeStatusRequest request,
        CancellationToken cancellationToken = default)
    {
        var qrCode = await qrCodeRepository.GetByIdAsync(
            GetRestaurantId(), id, cancellationToken);
        if (qrCode is null)
        {
            return null;
        }

        qrCode.IsActive = request.IsActive;
        await qrCodeRepository.SaveChangesAsync(cancellationToken);
        return ToDto(qrCode);
    }

    public async Task<bool> DeleteAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var qrCode = await qrCodeRepository.GetByIdAsync(
            GetRestaurantId(), id, cancellationToken);
        if (qrCode is null)
        {
            return false;
        }

        qrCodeRepository.Remove(qrCode);
        await qrCodeRepository.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<QrCodeScanResultDto> ScanAsync(
        ScanQrCodeRequest request,
        CancellationToken cancellationToken = default)
    {
        var restaurantId = GetRestaurantId();
        var qrCode = await qrCodeRepository.GetByTokenAsync(
            restaurantId, request.Token.Trim(), cancellationToken)
            ?? throw new QrCodeNotFoundException();
        if (!qrCode.IsActive)
        {
            throw new QrCodeInactiveException();
        }

        var customer = await qrCodeRepository.GetCustomerAsync(
            restaurantId, request.CustomerId, cancellationToken)
            ?? throw new QrCodeCustomerNotFoundException();

        customer.CurrentPoints = checked(customer.CurrentPoints + qrCode.PointsPerScan);
        customer.LifetimePoints = checked(customer.LifetimePoints + qrCode.PointsPerScan);
        var scannedAt = DateTimeOffset.UtcNow;
        qrCode.TotalScans = checked(qrCode.TotalScans + 1);
        qrCode.LastScannedAt = scannedAt;

        var transaction = new PointTransaction
        {
            RestaurantId = restaurantId,
            CustomerId = customer.Id,
            QrCodeId = qrCode.Id,
            Customer = customer,
            QrCode = qrCode,
            Points = qrCode.PointsPerScan,
            Type = PointTransactionType.Earn,
            Reason = $"QR scan: {qrCode.Name}",
            BalanceAfter = customer.CurrentPoints,
            CreatedAt = scannedAt,
        };

        await qrCodeRepository.AddTransactionAsync(transaction, cancellationToken);
        await qrCodeRepository.SaveChangesAsync(cancellationToken);

        return new QrCodeScanResultDto(
            ToDto(qrCode),
            customer.Id,
            $"{customer.FirstName} {customer.LastName}",
            qrCode.PointsPerScan,
            customer.CurrentPoints,
            transaction.Id,
            scannedAt);
    }

    private async Task<string> GenerateUniqueTokenAsync(
        CancellationToken cancellationToken)
    {
        string token;
        do
        {
            token = Convert.ToHexString(RandomNumberGenerator.GetBytes(32))
                .ToLowerInvariant();
        }
        while (await qrCodeRepository.TokenExistsAsync(token, cancellationToken));

        return token;
    }

    private Guid GetRestaurantId() =>
        currentTenant.RestaurantId
        ?? throw new UnauthorizedAccessException("The token does not contain a restaurant_id claim.");

    private static QrCodeDto ToDto(QrCode qrCode) => new(
        qrCode.Id,
        qrCode.Name,
        qrCode.Type,
        qrCode.Token,
        qrCode.PointsPerScan,
        qrCode.IsActive,
        qrCode.TotalScans,
        qrCode.LastScannedAt,
        qrCode.CreatedAt,
        qrCode.UpdatedAt);
}

public sealed class QrCodeNameConflictException : Exception
{
    public QrCodeNameConflictException()
        : base("A QR code with this name already exists for the restaurant.")
    {
    }
}

public sealed class QrCodeNotFoundException : Exception
{
    public QrCodeNotFoundException()
        : base("The QR code was not found for the authenticated restaurant.")
    {
    }
}

public sealed class QrCodeInactiveException : Exception
{
    public QrCodeInactiveException()
        : base("The QR code is inactive.")
    {
    }
}

public sealed class QrCodeCustomerNotFoundException : Exception
{
    public QrCodeCustomerNotFoundException()
        : base("The customer was not found for the authenticated restaurant.")
    {
    }
}
