using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Returnly.Api.Entities;

namespace Returnly.Api.Data.Configurations;

public sealed class PointTransactionConfiguration : IEntityTypeConfiguration<PointTransaction>
{
    public void Configure(EntityTypeBuilder<PointTransaction> builder)
    {
        builder.ToTable("point_transactions", tableBuilder =>
        {
            tableBuilder.HasCheckConstraint("CK_point_transactions_points", "\"Points\" > 0");
            tableBuilder.HasCheckConstraint("CK_point_transactions_balance_after", "\"BalanceAfter\" >= 0");
        });
        builder.HasKey(transaction => transaction.Id);
        builder.Property(transaction => transaction.Type)
            .HasConversion<string>()
            .HasMaxLength(20)
            .IsRequired();
        builder.Property(transaction => transaction.Reason)
            .HasMaxLength(500)
            .IsRequired();

        builder.HasIndex(transaction => transaction.RestaurantId);
        builder.HasIndex(transaction => new { transaction.RestaurantId, transaction.CustomerId });
        builder.HasIndex(transaction => new { transaction.RestaurantId, transaction.CreatedAt });
        builder.HasIndex(transaction => new { transaction.RestaurantId, transaction.Type });

        builder.HasOne(transaction => transaction.Restaurant)
            .WithMany(restaurant => restaurant.PointTransactions)
            .HasForeignKey(transaction => transaction.RestaurantId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(transaction => transaction.Customer)
            .WithMany(customer => customer.PointTransactions)
            .HasForeignKey(transaction => transaction.CustomerId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
