using System.Security.Cryptography;
using Returnly.Api.DTOs;
using Returnly.Api.Entities;
using Returnly.Api.Interfaces;

namespace Returnly.Api.Services;

public sealed class QrCodeService(
    IQrCodeRepository qrCodeRepository,
    IQrCodeScanProcessor qrCodeScanProcessor,
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
            ExpiresAt = request.ExpiresAt,
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
        CancellationToken cancellationToken = default) =>
        await qrCodeScanProcessor.ScanForCustomerAsync(
            GetRestaurantId(),
            request.Token.Trim(),
            request.CustomerId,
            cancellationToken);

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
        qrCode.ExpiresAt,
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
