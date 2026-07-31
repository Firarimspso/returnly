using System.ComponentModel.DataAnnotations;

namespace Returnly.Api.DTOs;

public sealed record RequestCustomerLoginCode(
    [param: Required, EmailAddress, MaxLength(254)] string Email);

public sealed record VerifyCustomerLoginCode(
    Guid ChallengeId,
    [param: Required, RegularExpression(@"^\d{6}$")] string VerificationCode);

public sealed record ResendCustomerLoginCode(Guid ChallengeId);

public sealed record CustomerRestaurantOptionDto(
    string CustomerKey,
    string RestaurantName,
    string? RestaurantLogoUrl,
    string PrimaryBrandColor,
    int CurrentPoints);

public enum CustomerLoginResultStatus
{
    Authenticated = 1,
    SelectRestaurant = 2,
    NoAccount = 3,
}

public sealed record CustomerLoginResultDto(
    CustomerLoginResultStatus Status,
    string? CustomerPortalToken,
    DateTimeOffset? CustomerPortalTokenExpiresAt,
    string? SelectionToken,
    DateTimeOffset? SelectionExpiresAt,
    IReadOnlyList<CustomerRestaurantOptionDto> Restaurants);

public sealed record SelectCustomerRestaurantRequest(
    [param: Required, MaxLength(100)] string SelectionToken,
    [param: Required, MaxLength(100)] string CustomerKey);
