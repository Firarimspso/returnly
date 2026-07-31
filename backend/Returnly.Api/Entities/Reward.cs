namespace Returnly.Api.Entities;

public sealed class Reward : BaseEntity, ITenantEntity
{
    public Guid RestaurantId { get; set; }
    public required string Name { get; set; }
    public required string Description { get; set; }
    public int RequiredPoints { get; set; }
    public bool IsActive { get; set; } = true;
    public RewardCategory Category { get; set; }
    public string? Icon { get; set; }
    public string? Color { get; set; }
    public int TotalRedemptions { get; set; }

    public Restaurant Restaurant { get; set; } = null!;
    public ICollection<RedemptionRequest> RedemptionRequests { get; set; } = new List<RedemptionRequest>();
}

public enum RewardCategory
{
    Food = 1,
    Drinks = 2,
    Discount = 3,
    Experience = 4,
}
