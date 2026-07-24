namespace Returnly.Api.DTOs;

public sealed record LoginResponse(
    string Token,
    DateTimeOffset ExpiresAt,
    AuthenticatedUserDto User);

public sealed record AuthenticatedUserDto(
    Guid Id,
    Guid RestaurantId,
    string FirstName,
    string LastName,
    string Email,
    string Role,
    string RestaurantName);
