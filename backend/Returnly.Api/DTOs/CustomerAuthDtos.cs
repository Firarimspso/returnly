using System.ComponentModel.DataAnnotations;
using Returnly.Api.Entities;

namespace Returnly.Api.DTOs;

public sealed class RequestCustomerVerificationCode
{
    [Required, MaxLength(200)]
    public required string QrToken { get; init; }

    public VerificationChannel Channel { get; init; }

    [Required, MaxLength(254)]
    public required string Identifier { get; init; }
}

public sealed record CustomerVerificationChallengeDto(
    Guid ChallengeId,
    string Message,
    string MaskedDestination,
    DateTimeOffset ExpiresAt,
    DateTimeOffset ResendAvailableAt);

public sealed class VerifyCustomerCodeRequest
{
    public Guid ChallengeId { get; init; }

    [Required, RegularExpression(@"^\d{6}$")]
    public required string VerificationCode { get; init; }
}

public sealed record VerifiedCustomerSummaryDto(
    Guid Id,
    string FirstName,
    string MaskedIdentifier);

public sealed record CustomerVerificationResultDto(
    string CustomerPortalToken,
    DateTimeOffset CustomerPortalTokenExpiresAt,
    VerifiedCustomerSummaryDto Customer,
    string RestaurantName,
    string? RestaurantLogoUrl,
    string PrimaryBrandColor,
    int PointsAwarded,
    int CurrentPoints,
    DateTimeOffset ScannedAt);

public sealed record ResendCustomerCodeRequest(Guid ChallengeId);

public sealed class TrustedCustomerScanRequest
{
    [Required, MaxLength(200)]
    public required string QrToken { get; init; }
}
