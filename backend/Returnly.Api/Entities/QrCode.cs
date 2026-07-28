namespace Returnly.Api.Entities;

public sealed class QrCode : BaseEntity, ITenantEntity
{
    public Guid RestaurantId { get; set; }
    public required string Name { get; set; }
    public QrCodeType Type { get; set; }
    public required string Token { get; set; }
    public int PointsPerScan { get; set; }
    public bool IsActive { get; set; } = true;
    public int TotalScans { get; set; }
    public DateTimeOffset? LastScannedAt { get; set; }
    public DateTimeOffset? ExpiresAt { get; set; }

    public Restaurant Restaurant { get; set; } = null!;
    public ICollection<PointTransaction> PointTransactions { get; set; } = new List<PointTransaction>();
    public ICollection<QrCodeScan> Scans { get; set; } = new List<QrCodeScan>();
}

public enum QrCodeType
{
    General = 1,
    Table = 2,
    Receipt = 3,
}
