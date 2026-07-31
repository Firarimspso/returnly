using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Returnly.Api.Entities;

namespace Returnly.Api.Data.Configurations;

public sealed class CustomerVerificationChallengeConfiguration
    : IEntityTypeConfiguration<CustomerVerificationChallenge>
{
    public void Configure(EntityTypeBuilder<CustomerVerificationChallenge> builder)
    {
        builder.ToTable("customer_verification_challenges");
        builder.HasKey(challenge => challenge.Id);
        builder.Property(challenge => challenge.Channel)
            .HasConversion<string>()
            .HasMaxLength(20)
            .IsRequired();
        builder.Property(challenge => challenge.NormalizedIdentifier)
            .HasMaxLength(254)
            .IsRequired();
        builder.Property(challenge => challenge.CodeHash)
            .HasMaxLength(128)
            .IsRequired();

        builder.HasIndex(challenge => challenge.RestaurantId);
        builder.HasIndex(challenge => challenge.QrCodeId);
        builder.HasIndex(challenge => new
        {
            challenge.RestaurantId,
            challenge.NormalizedIdentifier,
            challenge.CreatedAt,
        });

        builder.HasOne(challenge => challenge.Restaurant)
            .WithMany(restaurant => restaurant.CustomerVerificationChallenges)
            .HasForeignKey(challenge => challenge.RestaurantId)
            .OnDelete(DeleteBehavior.Cascade);
        builder.HasOne(challenge => challenge.QrCode)
            .WithMany(qrCode => qrCode.CustomerVerificationChallenges)
            .HasForeignKey(challenge => challenge.QrCodeId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
