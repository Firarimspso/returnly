namespace Returnly.Api.Entities;

public sealed class QrCodeScan : BaseEntity, ITenantEntity
{
    public Guid RestaurantId { get; set; }
    public Guid QrCodeId { get; set; }
    public Guid CustomerId { get; set; }
    public DateOnly ScanDate { get; set; }
    public int PointsAwarded { get; set; }

    public Restaurant Restaurant { get; set; } = null!;
    public QrCode QrCode { get; set; } = null!;
    public Customer Customer { get; set; } = null!;
}
