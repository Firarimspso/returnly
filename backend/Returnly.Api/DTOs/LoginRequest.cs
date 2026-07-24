using System.ComponentModel.DataAnnotations;

namespace Returnly.Api.DTOs;

public sealed class LoginRequest
{
    [Required, EmailAddress, MaxLength(254)]
    public required string Email { get; init; }

    [Required, MinLength(8), MaxLength(128)]
    public required string Password { get; init; }
}
