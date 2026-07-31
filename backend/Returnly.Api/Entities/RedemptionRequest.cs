namespace Returnly.Api.Entities;

public sealed class RedemptionRequest : BaseEntity, ITenantEntity
{
    public Guid RestaurantId { get; set; }
    public Guid CustomerId { get; set; }
    public Guid RewardId { get; set; }
    public required string ConfirmationCode { get; set; }
    public RedemptionRequestStatus Status { get; set; } = RedemptionRequestStatus.Pending;
    public DateTimeOffset ExpiresAt { get; set; }
    public DateTimeOffset? ConfirmedAt { get; set; }
    public Guid? ConfirmedByUserId { get; set; }

    public Restaurant Restaurant { get; set; } = null!;
    public Customer Customer { get; set; } = null!;
    public Reward Reward { get; set; } = null!;
    public User? ConfirmedByUser { get; set; }
}

public enum RedemptionRequestStatus
{
    Pending = 1,
    Confirmed = 2,
    Expired = 3,
    Cancelled = 4,
}
