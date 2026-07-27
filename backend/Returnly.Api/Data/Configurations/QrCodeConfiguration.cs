using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Returnly.Api.Entities;

namespace Returnly.Api.Data.Configurations;

public sealed class QrCodeConfiguration : IEntityTypeConfiguration<QrCode>
{
    public void Configure(EntityTypeBuilder<QrCode> builder)
    {
        builder.ToTable("qr_codes", tableBuilder =>
        {
            tableBuilder.HasCheckConstraint("CK_qr_codes_points_per_scan", "\"PointsPerScan\" > 0");
            tableBuilder.HasCheckConstraint("CK_qr_codes_total_scans", "\"TotalScans\" >= 0");
        });
        builder.HasKey(qrCode => qrCode.Id);
        builder.Property(qrCode => qrCode.Name).HasMaxLength(150).IsRequired();
        builder.Property(qrCode => qrCode.Type)
            .HasConversion<string>()
            .HasMaxLength(20)
            .IsRequired();
        builder.Property(qrCode => qrCode.Token)
            .HasMaxLength(128)
            .IsRequired();

        builder.HasIndex(qrCode => qrCode.Token).IsUnique();
        builder.HasIndex(qrCode => qrCode.RestaurantId);
        builder.HasIndex(qrCode => new { qrCode.RestaurantId, qrCode.Name }).IsUnique();
        builder.HasIndex(qrCode => new { qrCode.RestaurantId, qrCode.IsActive });

        builder.HasOne(qrCode => qrCode.Restaurant)
            .WithMany(restaurant => restaurant.QrCodes)
            .HasForeignKey(qrCode => qrCode.RestaurantId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
