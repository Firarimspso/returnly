using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Returnly.Api.Entities;

namespace Returnly.Api.Data.Configurations;

public sealed class RedemptionRequestConfiguration
    : IEntityTypeConfiguration<RedemptionRequest>
{
    public void Configure(EntityTypeBuilder<RedemptionRequest> builder)
    {
        builder.ToTable("redemption_requests");
        builder.HasKey(request => request.Id);
        builder.Property(request => request.ConfirmationCode)
            .HasMaxLength(12)
            .IsRequired();
        builder.Property(request => request.Status)
            .HasConversion<string>()
            .HasMaxLength(20)
            .IsRequired()
            .IsConcurrencyToken();

        builder.HasIndex(request => request.ConfirmationCode).IsUnique();
        builder.HasIndex(request => new
        {
            request.RestaurantId,
            request.CustomerId,
            request.CreatedAt,
        });
        builder.HasIndex(request => new
        {
            request.RestaurantId,
            request.Status,
            request.ExpiresAt,
        });

        builder.HasOne(request => request.Restaurant)
            .WithMany(restaurant => restaurant.RedemptionRequests)
            .HasForeignKey(request => request.RestaurantId)
            .OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(request => request.Customer)
            .WithMany(customer => customer.RedemptionRequests)
            .HasForeignKey(request => request.CustomerId)
            .OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(request => request.Reward)
            .WithMany(reward => reward.RedemptionRequests)
            .HasForeignKey(request => request.RewardId)
            .OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(request => request.ConfirmedByUser)
            .WithMany()
            .HasForeignKey(request => request.ConfirmedByUserId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
