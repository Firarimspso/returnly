using System.ComponentModel.DataAnnotations;

namespace Returnly.Api.Configuration;

public sealed class CustomerAuthOptions
{
    public const string SectionName = "CustomerAuth";

    [Range(5, 10)]
    public int CodeLifetimeMinutes { get; init; } = 10;

    [Range(30, 300)]
    public int ResendCooldownSeconds { get; init; } = 60;

    [Range(3, 10)]
    public int MaxAttempts { get; init; } = 5;

    [Range(1, 10)]
    public int MaxResends { get; init; } = 3;

    [MinLength(32)]
    public required string CodeHashSecret { get; init; }

    public bool EmailEnabled { get; init; } = true;
    public bool SmsEnabled { get; init; }
}
