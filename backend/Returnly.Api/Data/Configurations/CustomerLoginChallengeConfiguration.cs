using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Returnly.Api.Entities;

namespace Returnly.Api.Data.Configurations;

public sealed class CustomerLoginChallengeConfiguration
    : IEntityTypeConfiguration<CustomerLoginChallenge>
{
    public void Configure(EntityTypeBuilder<CustomerLoginChallenge> builder)
    {
        builder.ToTable("customer_login_challenges");
        builder.HasKey(challenge => challenge.Id);
        builder.Property(challenge => challenge.NormalizedEmail)
            .HasMaxLength(254).IsRequired();
        builder.Property(challenge => challenge.CodeHash)
            .HasMaxLength(128).IsRequired();
        builder.Property(challenge => challenge.SelectionTokenHash)
            .HasMaxLength(64);
        builder.HasIndex(challenge => new
        {
            challenge.NormalizedEmail,
            challenge.CreatedAt,
        });
        builder.HasIndex(challenge => challenge.SelectionTokenHash)
            .IsUnique();
    }
}
