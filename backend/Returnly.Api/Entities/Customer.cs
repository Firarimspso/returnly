namespace Returnly.Api.Entities;

public sealed class Customer : BaseEntity, ITenantEntity
{
    public Guid RestaurantId { get; set; }
    public required string FirstName { get; set; }
    public required string LastName { get; set; }
    public required string Email { get; set; }
    public required string PhoneNumber { get; set; }
    public DateOnly? Birthday { get; set; }
    public CustomerStatus Status { get; set; } = CustomerStatus.Active;
    public int CurrentPoints { get; set; }
    public int LifetimePoints { get; set; }
    public int TotalVisits { get; set; }
    public DateTimeOffset? LastVisitAt { get; set; }
    public string? FavoriteReward { get; set; }
    public int RewardsRedeemed { get; set; }

    public Restaurant Restaurant { get; set; } = null!;
    public ICollection<PointTransaction> PointTransactions { get; set; } = new List<PointTransaction>();
}

public enum CustomerStatus
{
    Active = 1,
    Vip = 2,
    New = 3,
    Inactive = 4,
}
