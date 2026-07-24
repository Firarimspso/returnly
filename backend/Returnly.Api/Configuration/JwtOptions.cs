using System.ComponentModel.DataAnnotations;

namespace Returnly.Api.Configuration;

public sealed class JwtOptions
{
    public const string SectionName = "Jwt";

    [Required] public string Issuer { get; init; } = string.Empty;
    [Required] public string Audience { get; init; } = string.Empty;
    [Required, MinLength(32)] public string Secret { get; init; } = string.Empty;
    [Range(1, 1440)] public int AccessTokenMinutes { get; init; } = 60;
}
