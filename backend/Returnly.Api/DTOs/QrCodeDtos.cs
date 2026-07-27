using System.ComponentModel.DataAnnotations;
using Returnly.Api.Entities;

namespace Returnly.Api.DTOs;

public sealed class QrCodeQueryParameters
{
    private int _pageSize = 20;

    [Range(1, int.MaxValue)]
    public int Page { get; init; } = 1;

    [Range(1, 100)]
    public int PageSize
    {
        get => _pageSize;
        init => _pageSize = Math.Min(value, 100);
    }

    [MaxLength(150)]
    public string? Search { get; init; }

    public bool? IsActive { get; init; }
    public QrCodeType? Type { get; init; }
}

public sealed class CreateQrCodeRequest
{
    [Required, MaxLength(150)]
    public required string Name { get; init; }

    public QrCodeType Type { get; init; }

    [Range(1, 10000)]
    public int PointsPerScan { get; init; }

    public bool IsActive { get; init; } = true;
}

public sealed class SetQrCodeStatusRequest
{
    public bool IsActive { get; init; }
}

public sealed class ScanQrCodeRequest
{
    [Required, MaxLength(128)]
    public required string Token { get; init; }

    public Guid CustomerId { get; init; }
}

public sealed record QrCodeDto(
    Guid Id,
    string Name,
    QrCodeType Type,
    string Token,
    int PointsPerScan,
    bool IsActive,
    int TotalScans,
    DateTimeOffset? LastScannedAt,
    DateTimeOffset CreatedAt,
    DateTimeOffset? UpdatedAt);

public sealed record QrCodeScanResultDto(
    QrCodeDto QrCode,
    Guid CustomerId,
    string CustomerName,
    int PointsAwarded,
    int CurrentPoints,
    Guid PointTransactionId,
    DateTimeOffset ScannedAt);
