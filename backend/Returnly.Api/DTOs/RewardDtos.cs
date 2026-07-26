using System.ComponentModel.DataAnnotations;
using Returnly.Api.Entities;

namespace Returnly.Api.DTOs;

public sealed class RewardQueryParameters
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
    public RewardCategory? Category { get; init; }
}

public sealed class CreateRewardRequest
{
    [Required, MaxLength(150)] public required string Name { get; init; }
    [Required, MaxLength(500)] public required string Description { get; init; }
    [Range(1, int.MaxValue)] public int RequiredPoints { get; init; }
    public bool IsActive { get; init; } = true;
    public RewardCategory Category { get; init; }
    [MaxLength(100)] public string? Icon { get; init; }
    [MaxLength(30)] public string? Color { get; init; }
}

public sealed class UpdateRewardRequest
{
    [Required, MaxLength(150)] public required string Name { get; init; }
    [Required, MaxLength(500)] public required string Description { get; init; }
    [Range(1, int.MaxValue)] public int RequiredPoints { get; init; }
    public bool IsActive { get; init; }
    public RewardCategory Category { get; init; }
    [MaxLength(100)] public string? Icon { get; init; }
    [MaxLength(30)] public string? Color { get; init; }
}

public sealed record RewardDto(
    Guid Id,
    string Name,
    string Description,
    int RequiredPoints,
    bool IsActive,
    RewardCategory Category,
    string? Icon,
    string? Color,
    int TotalRedemptions,
    DateTimeOffset CreatedAt,
    DateTimeOffset? UpdatedAt);
