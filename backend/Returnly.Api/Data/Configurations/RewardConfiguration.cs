using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Returnly.Api.Entities;

namespace Returnly.Api.Data.Configurations;

public sealed class RewardConfiguration : IEntityTypeConfiguration<Reward>
{
    public void Configure(EntityTypeBuilder<Reward> builder)
    {
        builder.ToTable("rewards", tableBuilder =>
        {
            tableBuilder.HasCheckConstraint("CK_rewards_required_points", "\"RequiredPoints\" > 0");
            tableBuilder.HasCheckConstraint("CK_rewards_total_redemptions", "\"TotalRedemptions\" >= 0");
        });
        builder.HasKey(reward => reward.Id);
        builder.Property(reward => reward.Name).HasMaxLength(150).IsRequired();
        builder.Property(reward => reward.Description).HasMaxLength(500).IsRequired();
        builder.Property(reward => reward.Category)
            .HasConversion<string>()
            .HasMaxLength(30)
            .IsRequired();
        builder.Property(reward => reward.Icon).HasMaxLength(100);
        builder.Property(reward => reward.Color).HasMaxLength(30);

        builder.HasIndex(reward => reward.RestaurantId);
        builder.HasIndex(reward => new { reward.RestaurantId, reward.Name }).IsUnique();
        builder.HasIndex(reward => new { reward.RestaurantId, reward.IsActive });

        builder.HasOne(reward => reward.Restaurant)
            .WithMany(restaurant => restaurant.Rewards)
            .HasForeignKey(reward => reward.RestaurantId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
