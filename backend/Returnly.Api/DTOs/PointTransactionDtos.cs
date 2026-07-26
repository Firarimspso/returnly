using System.ComponentModel.DataAnnotations;
using Returnly.Api.Entities;

namespace Returnly.Api.DTOs;

public sealed class PointTransactionQueryParameters
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

    public Guid? CustomerId { get; init; }
    public PointTransactionType? Type { get; init; }

    [MaxLength(500)]
    public string? Search { get; init; }
}

public sealed class CreatePointTransactionRequest
{
    public Guid CustomerId { get; init; }

    [Range(1, int.MaxValue)]
    public int Points { get; init; }

    [Required, MaxLength(500)]
    public required string Reason { get; init; }
}

public sealed record PointTransactionDto(
    Guid Id,
    Guid CustomerId,
    string CustomerName,
    int Points,
    PointTransactionType Type,
    string Reason,
    int BalanceAfter,
    DateTimeOffset CreatedAt);
