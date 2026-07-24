using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Returnly.Api.Entities;

namespace Returnly.Api.Data.Configurations;

public sealed class CustomerConfiguration : IEntityTypeConfiguration<Customer>
{
    public void Configure(EntityTypeBuilder<Customer> builder)
    {
        builder.ToTable("customers");
        builder.HasKey(customer => customer.Id);
        builder.Property(customer => customer.FirstName).HasMaxLength(100).IsRequired();
        builder.Property(customer => customer.LastName).HasMaxLength(100).IsRequired();
        builder.Property(customer => customer.Email).HasMaxLength(254).IsRequired();
        builder.Property(customer => customer.PhoneNumber).HasMaxLength(30).IsRequired();
        builder.Property(customer => customer.Status)
            .HasConversion<string>()
            .HasMaxLength(30)
            .IsRequired();
        builder.Property(customer => customer.FavoriteReward).HasMaxLength(150);

        builder.HasIndex(customer => customer.RestaurantId);
        builder.HasIndex(customer => new { customer.RestaurantId, customer.Email }).IsUnique();
        builder.HasIndex(customer => new { customer.RestaurantId, customer.PhoneNumber });

        builder.HasOne(customer => customer.Restaurant)
            .WithMany(restaurant => restaurant.Customers)
            .HasForeignKey(customer => customer.RestaurantId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
