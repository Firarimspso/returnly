namespace Returnly.Api.Entities;

public sealed class CustomerLoginChallenge : BaseEntity
{
    public required string NormalizedEmail { get; set; }
    public required string CodeHash { get; set; }
    public DateTimeOffset ExpiresAt { get; set; }
    public DateTimeOffset? ConsumedAt { get; set; }
    public DateTimeOffset? VerifiedAt { get; set; }
    public string? SelectionTokenHash { get; set; }
    public DateTimeOffset? SelectionExpiresAt { get; set; }
    public int AttemptCount { get; set; }
    public int ResendCount { get; set; }
    public DateTimeOffset LastSentAt { get; set; }
}
