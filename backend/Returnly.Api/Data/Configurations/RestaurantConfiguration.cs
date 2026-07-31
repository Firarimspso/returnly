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
        builder.Property(restaurant => restaurant.LogoUrl).HasColumnType("text");
        builder.Property(restaurant => restaurant.CoverImageUrl).HasColumnType("text");
        builder.Property(restaurant => restaurant.Description).HasMaxLength(1000);
        builder.Property(restaurant => restaurant.Website).HasMaxLength(300);
        builder.Property(restaurant => restaurant.BusinessHours)
            .HasColumnType("jsonb")
            .HasDefaultValue("{}")
            .IsRequired();
        builder.Property(restaurant => restaurant.Instagram).HasMaxLength(300);
        builder.Property(restaurant => restaurant.Facebook).HasMaxLength(300);
        builder.Property(restaurant => restaurant.PrimaryBrandColor)
            .HasMaxLength(7)
            .HasDefaultValue("#6952E8")
            .IsRequired();
        builder.Property(restaurant => restaurant.TimeZone)
            .HasMaxLength(100)
            .IsRequired();
        builder.Property(restaurant => restaurant.Currency)
            .HasMaxLength(3)
            .IsFixedLength()
            .IsRequired();

        builder.HasIndex(restaurant => restaurant.Slug).IsUnique();
        builder.HasIndex(restaurant => restaurant.Email).IsUnique();

        builder.HasData(
            new Restaurant
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
            },
            new Restaurant
            {
                Id = SeedData.SecondDemoRestaurantId,
                Name = "Cedar & Plate",
                Slug = "cedar-plate",
                Email = "hello@cedarplate.com",
                PhoneNumber = "+961 1 555 019",
                Address = "Mar Mikhael, Beirut, Lebanon",
                TimeZone = "Asia/Beirut",
                Currency = "USD",
                IsActive = true,
                CreatedAt = SeedData.SeededAt,
            });
    }
}
