using System.ComponentModel.DataAnnotations;
using Returnly.Api.Entities;

namespace Returnly.Api.DTOs;

public sealed class PublicQrScanRequest
{
    [Required, MaxLength(254)]
    public required string Identifier { get; init; }
}

public sealed record PublicQrCodeDto(
    string RestaurantName,
    string QrCodeName,
    QrCodeType Type,
    int PointsPerScan,
    DateTimeOffset? ExpiresAt);

public sealed record PublicQrScanResultDto(
    string RestaurantName,
    string CustomerFirstName,
    int PointsAwarded,
    int CurrentPoints,
    DateTimeOffset ScannedAt);
