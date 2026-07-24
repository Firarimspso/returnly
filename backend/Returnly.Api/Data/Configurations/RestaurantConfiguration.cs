using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Returnly.Api.Entities;

namespace Returnly.Api.Data.Configurations;

public sealed class RestaurantConfiguration : IEntityTypeConfiguration<Restaurant>
{
    public void Configure(EntityTypeBuilder<Restaurant> builder)
    {
        builder.ToTable("restaurants");
        builder.HasKey(restaurant => restaurant.Id);

        builder.Property(restaurant => restaurant.Name)
            .HasMaxLength(150)
            .IsRequired();
        builder.Property(restaurant => restaurant.Slug)
            .HasMaxLength(100)
            .IsRequired();
        builder.Property(restaurant => restaurant.Email)
            .HasMaxLength(254)
            .IsRequired();
        builder.Property(restaurant => restaurant.PhoneNumber)
            .HasMaxLength(30);
        builder.Property(restaurant => restaurant.Address)
            .HasMaxLength(500);
        builder.Property(restaurant => restaurant.TimeZone)
            .HasMaxLength(100)
            .IsRequired();
        builder.Property(restaurant => restaurant.Currency)
            .HasMaxLength(3)
            .IsFixedLength()
            .IsRequired();

        builder.HasIndex(restaurant => restaurant.Slug).IsUnique();
        builder.HasIndex(restaurant => restaurant.Email).IsUnique();

        builder.HasData(new Restaurant
        {
            Id = SeedData.DemoRestaurantId,
            Name = "Solé & Maple",
            Slug = "sole-maple",
            Email = "hello@solemaple.com",
            PhoneNumber = "+1 (503) 555-0142",
            Address = "214 Maple Street, Portland, OR 97205",
            TimeZone = "America/Los_Angeles",
            Currency = "USD",
            IsActive = true,
            CreatedAt = SeedData.SeededAt,
        });
    }
}
