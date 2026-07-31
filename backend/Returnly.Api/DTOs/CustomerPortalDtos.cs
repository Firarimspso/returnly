using System.ComponentModel.DataAnnotations;
using Returnly.Api.Entities;

namespace Returnly.Api.DTOs;

public sealed record CustomerPortalDto(
    string RestaurantName,
    string? RestaurantLogoUrl,
    string? RestaurantCoverImageUrl,
    string? RestaurantDescription,
    string PrimaryBrandColor,
    string CustomerFirstName,
    int CurrentPoints,
    IReadOnlyList<CustomerPortalRewardDto> Rewards,
    IReadOnlyList<CustomerPortalTransactionDto> RecentTransactions,
    IReadOnlyList<CustomerPortalRedemptionDto> PreviousRedemptions);

public sealed record CustomerPortalRewardDto(
    Guid Id,
    string Name,
    string Description,
    int RequiredPoints,
    string? Icon,
    string? Color,
    bool IsUnlocked,
    int PointsRemaining,
    decimal ProgressPercentage);

public sealed record CustomerPortalTransactionDto(
    Guid Id,
    PointTransactionType Type,
    int Points,
    string Reason,
    int BalanceAfter,
    DateTimeOffset CreatedAt);

public sealed record CustomerPortalRedemptionDto(
    Guid Id,
    string RewardName,
    int Points,
    RedemptionRequestStatus Status,
    DateTimeOffset RequestedAt,
    DateTimeOffset? ConfirmedAt);

public sealed record CreateRedemptionRequest(Guid RewardId);

public sealed record RedemptionRequestDto(
    Guid Id,
    Guid RewardId,
    string RewardName,
    int RequiredPoints,
    string ConfirmationCode,
    RedemptionRequestStatus Status,
    DateTimeOffset ExpiresAt);

public sealed record ConfirmRedemptionRequest(string ConfirmationCode);

public sealed class RedemptionRequestQueryParameters
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

    public RedemptionRequestStatus? Status { get; init; }
}

public sealed record AdminRedemptionRequestDto(
    Guid Id,
    Guid CustomerId,
    string CustomerName,
    string CustomerEmail,
    Guid RewardId,
    string RewardName,
    int RequiredPoints,
    string ConfirmationCode,
    RedemptionRequestStatus Status,
    DateTimeOffset RequestedAt,
    DateTimeOffset ExpiresAt,
    DateTimeOffset? ConfirmedAt);

public sealed record ConfirmedRedemptionDto(
    Guid Id,
    Guid CustomerId,
    string CustomerName,
    Guid RewardId,
    string RewardName,
    int PointsDeducted,
    int CurrentPoints,
    DateTimeOffset ConfirmedAt);
