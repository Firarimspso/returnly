using Microsoft.EntityFrameworkCore;
using Npgsql;
using Returnly.Api.DTOs;
using Returnly.Api.Entities;
using Returnly.Api.Interfaces;

namespace Returnly.Api.Services;

public sealed class QrCodeScanProcessor(
    IQrCodeRepository qrCodeRepository,
    ICustomerPortalTokenService customerPortalTokenService)
    : IQrCodeScanProcessor
{
    public async Task<QrCodeScanResultDto> ScanForCustomerAsync(
        Guid restaurantId,
        string token,
        Guid customerId,
        CancellationToken cancellationToken = default)
    {
        var qrCode = await qrCodeRepository.GetByTokenAsync(
            restaurantId, token, cancellationToken)
            ?? throw new QrCodeNotFoundException();
        EnsureAvailable(qrCode);
        var customer = await qrCodeRepository.GetCustomerAsync(
            restaurantId, customerId, cancellationToken)
            ?? throw new QrCodeCustomerNotFoundException();
        var result = await AwardAsync(qrCode, customer, cancellationToken);

        return new QrCodeScanResultDto(
            ToQrCodeDto(qrCode),
            customer.Id,
            $"{customer.FirstName} {customer.LastName}",
            result.PointsAwarded,
            result.CurrentPoints,
            result.PointTransactionId,
            result.ScannedAt);
    }

    public async Task<PublicQrCodeDto> ValidatePublicAsync(
        string token,
        CancellationToken cancellationToken = default)
    {
        var qrCode = await GetPublicQrCodeAsync(token, cancellationToken);
        EnsureAvailable(qrCode);
        return ToPublicDto(qrCode);
    }

    public async Task<PublicQrScanResultDto> ScanPublicAsync(
        string token,
        string identifier,
        CancellationToken cancellationToken = default)
    {
        var qrCode = await GetPublicQrCodeAsync(token, cancellationToken);
        EnsureAvailable(qrCode);
        var customer = await qrCodeRepository.GetCustomerByIdentifierAsync(
            qrCode.RestaurantId, identifier, cancellationToken)
            ?? throw new QrCodeCustomerNotFoundException();
        var result = await AwardAsync(qrCode, customer, cancellationToken);
        var portalToken = customerPortalTokenService.Generate(customer);

        return new PublicQrScanResultDto(
            qrCode.Restaurant.Name,
            qrCode.Restaurant.LogoUrl,
            qrCode.Restaurant.PrimaryBrandColor,
            customer.FirstName,
            result.PointsAwarded,
            result.CurrentPoints,
            result.ScannedAt,
            portalToken.Value,
            portalToken.ExpiresAt);
    }

    public async Task<PublicQrScanResultDto> ScanAuthenticatedPublicAsync(
        Guid restaurantId,
        string token,
        Guid customerId,
        CancellationToken cancellationToken = default)
    {
        var qrCode = await qrCodeRepository.GetByTokenAsync(
            restaurantId, token, cancellationToken)
            ?? throw new QrCodeNotFoundException();
        EnsureAvailable(qrCode);
        var customer = await qrCodeRepository.GetCustomerAsync(
            restaurantId, customerId, cancellationToken)
            ?? throw new QrCodeCustomerNotFoundException();
        var result = await AwardAsync(qrCode, customer, cancellationToken);
        var portalToken = customerPortalTokenService.Generate(customer);

        return new PublicQrScanResultDto(
            qrCode.Restaurant.Name,
            qrCode.Restaurant.LogoUrl,
            qrCode.Restaurant.PrimaryBrandColor,
            customer.FirstName,
            result.PointsAwarded,
            result.CurrentPoints,
            result.ScannedAt,
            portalToken.Value,
            portalToken.ExpiresAt);
    }

    private async Task<ScanAwardResult> AwardAsync(
        QrCode qrCode,
        Customer customer,
        CancellationToken cancellationToken)
    {
        var scannedAt = DateTimeOffset.UtcNow;
        var scanDate = DateOnly.FromDateTime(scannedAt.UtcDateTime);
        if (await qrCodeRepository.ScanExistsAsync(
                qrCode.Id, customer.Id, scanDate, cancellationToken))
        {
            throw new QrCodeDuplicateScanException();
        }

        customer.CurrentPoints = checked(customer.CurrentPoints + qrCode.PointsPerScan);
        customer.LifetimePoints = checked(customer.LifetimePoints + qrCode.PointsPerScan);
        qrCode.TotalScans = checked(qrCode.TotalScans + 1);
        qrCode.LastScannedAt = scannedAt;

        var transaction = new PointTransaction
        {
            RestaurantId = qrCode.RestaurantId,
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
        var scan = new QrCodeScan
        {
            RestaurantId = qrCode.RestaurantId,
            QrCodeId = qrCode.Id,
            CustomerId = customer.Id,
            QrCode = qrCode,
            Customer = customer,
            PointsAwarded = qrCode.PointsPerScan,
            ScanDate = scanDate,
            CreatedAt = scannedAt,
        };

        await qrCodeRepository.AddTransactionAsync(transaction, cancellationToken);
        await qrCodeRepository.AddScanAsync(scan, cancellationToken);
        try
        {
            await qrCodeRepository.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException exception)
            when (exception.InnerException is PostgresException
            {
                SqlState: PostgresErrorCodes.UniqueViolation,
            })
        {
            throw new QrCodeDuplicateScanException();
        }

        return new ScanAwardResult(
            qrCode.PointsPerScan,
            customer.CurrentPoints,
            transaction.Id,
            scannedAt);
    }

    private async Task<QrCode> GetPublicQrCodeAsync(
        string token,
        CancellationToken cancellationToken) =>
        await qrCodeRepository.GetPublicByTokenAsync(token.Trim(), cancellationToken)
        ?? throw new QrCodeNotFoundException();

    private static void EnsureAvailable(QrCode qrCode)
    {
        if (!qrCode.IsActive)
        {
            throw new QrCodeInactiveException();
        }
        if (qrCode.ExpiresAt.HasValue && qrCode.ExpiresAt.Value <= DateTimeOffset.UtcNow)
        {
            throw new QrCodeExpiredException();
        }
    }

    private static PublicQrCodeDto ToPublicDto(QrCode qrCode) => new(
        qrCode.Restaurant.Name,
        qrCode.Restaurant.LogoUrl,
        qrCode.Restaurant.CoverImageUrl,
        qrCode.Restaurant.Description,
        qrCode.Restaurant.PrimaryBrandColor,
        qrCode.Name,
        qrCode.Type,
        qrCode.PointsPerScan,
        qrCode.ExpiresAt);

    private static QrCodeDto ToQrCodeDto(QrCode qrCode) => new(
        qrCode.Id,
        qrCode.Name,
        qrCode.Type,
        qrCode.Token,
        qrCode.PointsPerScan,
        qrCode.IsActive,
        qrCode.TotalScans,
        qrCode.LastScannedAt,
        qrCode.ExpiresAt,
        qrCode.CreatedAt,
        qrCode.UpdatedAt);

    private sealed record ScanAwardResult(
        int PointsAwarded,
        int CurrentPoints,
        Guid PointTransactionId,
        DateTimeOffset ScannedAt);
}

public sealed class QrCodeExpiredException : Exception
{
    public QrCodeExpiredException()
        : base("This QR code has expired.")
    {
    }
}

public sealed class QrCodeDuplicateScanException : Exception
{
    public QrCodeDuplicateScanException()
        : base("Points have already been awarded for this QR code today.")
    {
    }
}
