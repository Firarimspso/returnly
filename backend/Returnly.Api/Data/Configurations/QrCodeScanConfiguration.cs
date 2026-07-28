using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Returnly.Api.Entities;

namespace Returnly.Api.Data.Configurations;

public sealed class QrCodeScanConfiguration : IEntityTypeConfiguration<QrCodeScan>
{
    public void Configure(EntityTypeBuilder<QrCodeScan> builder)
    {
        builder.ToTable("qr_code_scans", tableBuilder =>
            tableBuilder.HasCheckConstraint(
                "CK_qr_code_scans_points_awarded",
                "\"PointsAwarded\" > 0"));
        builder.HasKey(scan => scan.Id);

        builder.HasIndex(scan => scan.RestaurantId);
        builder.HasIndex(scan => new { scan.QrCodeId, scan.CustomerId, scan.ScanDate })
            .IsUnique();

        builder.HasOne(scan => scan.Restaurant)
            .WithMany(restaurant => restaurant.QrCodeScans)
            .HasForeignKey(scan => scan.RestaurantId)
            .OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(scan => scan.QrCode)
            .WithMany(qrCode => qrCode.Scans)
            .HasForeignKey(scan => scan.QrCodeId)
            .OnDelete(DeleteBehavior.Cascade);
        builder.HasOne(scan => scan.Customer)
            .WithMany(customer => customer.QrCodeScans)
            .HasForeignKey(scan => scan.CustomerId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
