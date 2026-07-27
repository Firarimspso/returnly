namespace Returnly.Api.Entities;

public sealed class PointTransaction : BaseEntity, ITenantEntity
{
    public Guid RestaurantId { get; set; }
    public Guid CustomerId { get; set; }
    public Guid? QrCodeId { get; set; }
    public int Points { get; set; }
    public PointTransactionType Type { get; set; }
    public required string Reason { get; set; }
    public int BalanceAfter { get; set; }

    public Restaurant Restaurant { get; set; } = null!;
    public Customer Customer { get; set; } = null!;
    public QrCode? QrCode { get; set; }
}

public enum PointTransactionType
{
    Earn = 1,
    Redeem = 2,
}
