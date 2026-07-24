using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Returnly.Api.Entities;

namespace Returnly.Api.Data.Configurations;

public sealed class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.ToTable("users");
        builder.HasKey(user => user.Id);

        builder.Property(user => user.FirstName)
            .HasMaxLength(100)
            .IsRequired();
        builder.Property(user => user.LastName)
            .HasMaxLength(100)
            .IsRequired();
        builder.Property(user => user.Email)
            .HasMaxLength(254)
            .IsRequired();
        builder.Property(user => user.PasswordHash)
            .HasMaxLength(500)
            .IsRequired();
        builder.Property(user => user.Role)
            .HasConversion<string>()
            .HasMaxLength(30)
            .IsRequired();

        builder.HasIndex(user => new { user.RestaurantId, user.Email }).IsUnique();

        builder.HasOne(user => user.Restaurant)
            .WithMany(restaurant => restaurant.Users)
            .HasForeignKey(user => user.RestaurantId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasData(new User
        {
            Id = SeedData.DemoAdminUserId,
            RestaurantId = SeedData.DemoRestaurantId,
            FirstName = "Adam",
            LastName = "Miller",
            Email = SeedData.DemoAdminEmail,
            PasswordHash = SeedData.DemoAdminPasswordHash,
            Role = UserRole.Admin,
            IsActive = true,
            CreatedAt = SeedData.SeededAt,
        });
    }
}
