namespace Returnly.Api.Entities;

public sealed class CustomerVerificationChallenge : BaseEntity, ITenantEntity
{
    public Guid RestaurantId { get; set; }
    public Guid QrCodeId { get; set; }
    public VerificationChannel Channel { get; set; }
    public required string NormalizedIdentifier { get; set; }
    public required string CodeHash { get; set; }
    public DateTimeOffset ExpiresAt { get; set; }
    public DateTimeOffset? ConsumedAt { get; set; }
    public int AttemptCount { get; set; }
    public int ResendCount { get; set; }
    public DateTimeOffset LastSentAt { get; set; }

    public Restaurant Restaurant { get; set; } = null!;
    public QrCode QrCode { get; set; } = null!;
}

public enum VerificationChannel
{
    Email = 1,
    Phone = 2,
}
