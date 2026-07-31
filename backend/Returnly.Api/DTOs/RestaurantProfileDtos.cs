using System.ComponentModel.DataAnnotations;

namespace Returnly.Api.DTOs;

public sealed record RestaurantProfileDto(
    Guid Id,
    string Name,
    string? LogoUrl,
    string? CoverImageUrl,
    string? Description,
    string? Phone,
    string Email,
    string? Website,
    string? Address,
    string BusinessHours,
    string? Instagram,
    string? Facebook,
    string PrimaryBrandColor,
    DateTimeOffset? UpdatedAt);

public sealed class UpdateRestaurantProfileRequest
{
    [Required, MaxLength(150)]
    public required string Name { get; init; }

    public string? LogoUrl { get; init; }
    public string? CoverImageUrl { get; init; }

    [MaxLength(1000)]
    public string? Description { get; init; }

    [MaxLength(13)]
    [RegularExpression(
        @"^\+961(?:[13456789]\d{6}|(?:70|71|76|78|79|81)\d{6})$",
        ErrorMessage = "Phone must be a valid Lebanese landline or mobile number in E.164 format.")]
    public string? Phone { get; init; }

    [Required, EmailAddress, MaxLength(254)]
    public required string Email { get; init; }

    [Url, MaxLength(300)]
    public string? Website { get; init; }

    [MaxLength(500)]
    public string? Address { get; init; }

    [Required]
    public string BusinessHours { get; init; } = "{}";

    [Url, MaxLength(300)]
    public string? Instagram { get; init; }

    [Url, MaxLength(300)]
    public string? Facebook { get; init; }

    [Required, RegularExpression("^#[0-9A-Fa-f]{6}$")]
    public string PrimaryBrandColor { get; init; } = "#6952E8";
}
