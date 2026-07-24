namespace Returnly.Api.Entities;

public sealed class User : BaseEntity, ITenantEntity
{
    public Guid RestaurantId { get; set; }
    public required string FirstName { get; set; }
    public required string LastName { get; set; }
    public required string Email { get; set; }
    public required string PasswordHash { get; set; }
    public UserRole Role { get; set; } = UserRole.Staff;
    public bool IsActive { get; set; } = true;
    public DateTimeOffset? LastLoginAt { get; set; }

    public Restaurant Restaurant { get; set; } = null!;
}

public enum UserRole
{
    Owner = 1,
    Admin = 2,
    Manager = 3,
    Staff = 4,
}
