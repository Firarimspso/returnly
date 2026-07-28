namespace Returnly.Api.Entities;

public sealed class Restaurant : BaseEntity
{
    public required string Name { get; set; }
    public required string Slug { get; set; }
    public required string Email { get; set; }
    public string? PhoneNumber { get; set; }
    public string? Address { get; set; }
    public string TimeZone { get; set; } = "UTC";
    public string Currency { get; set; } = "USD";
    public bool IsActive { get; set; } = true;

    public ICollection<User> Users { get; set; } = new List<User>();
    public ICollection<Customer> Customers { get; set; } = new List<Customer>();
    public ICollection<Reward> Rewards { get; set; } = new List<Reward>();
    public ICollection<PointTransaction> PointTransactions { get; set; } = new List<PointTransaction>();
    public ICollection<QrCode> QrCodes { get; set; } = new List<QrCode>();
    public ICollection<QrCodeScan> QrCodeScans { get; set; } = new List<QrCodeScan>();
}
