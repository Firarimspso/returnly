using System.ComponentModel.DataAnnotations;
using Returnly.Api.Entities;

namespace Returnly.Api.DTOs;

public sealed class CustomerQueryParameters
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
}

public sealed class CreateCustomerRequest
{
    [Required, MaxLength(100)] public required string FirstName { get; init; }
    [Required, MaxLength(100)] public required string LastName { get; init; }
    [Required, EmailAddress, MaxLength(254)] public required string Email { get; init; }
    [Required, MaxLength(30)] public required string PhoneNumber { get; init; }
    public DateOnly? Birthday { get; init; }
    public CustomerStatus Status { get; init; } = CustomerStatus.Active;
}

public sealed class UpdateCustomerRequest
{
    [Required, MaxLength(100)] public required string FirstName { get; init; }
    [Required, MaxLength(100)] public required string LastName { get; init; }
    [Required, EmailAddress, MaxLength(254)] public required string Email { get; init; }
    [Required, MaxLength(30)] public required string PhoneNumber { get; init; }
    public DateOnly? Birthday { get; init; }
    public CustomerStatus Status { get; init; }
}

public sealed record CustomerDto(
    Guid Id,
    string FirstName,
    string LastName,
    string FullName,
    string Email,
    string PhoneNumber,
    DateOnly? Birthday,
    CustomerStatus Status,
    int CurrentPoints,
    int LifetimePoints,
    int TotalVisits,
    DateTimeOffset? LastVisitAt,
    string? FavoriteReward,
    int RewardsRedeemed,
    DateTimeOffset CreatedAt,
    DateTimeOffset? UpdatedAt);

public sealed record PagedResponse<T>(
    IReadOnlyList<T> Items,
    int Page,
    int PageSize,
    int TotalCount,
    int TotalPages);
