using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Returnly.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddPublicQrScanFlow : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "ExpiresAt",
                table: "qr_codes",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "qr_code_scans",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    RestaurantId = table.Column<Guid>(type: "uuid", nullable: false),
                    QrCodeId = table.Column<Guid>(type: "uuid", nullable: false),
                    CustomerId = table.Column<Guid>(type: "uuid", nullable: false),
                    ScanDate = table.Column<DateOnly>(type: "date", nullable: false),
                    PointsAwarded = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_qr_code_scans", x => x.Id);
                    table.CheckConstraint("CK_qr_code_scans_points_awarded", "\"PointsAwarded\" > 0");
                    table.ForeignKey(
                        name: "FK_qr_code_scans_customers_CustomerId",
                        column: x => x.CustomerId,
                        principalTable: "customers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_qr_code_scans_qr_codes_QrCodeId",
                        column: x => x.QrCodeId,
                        principalTable: "qr_codes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_qr_code_scans_restaurants_RestaurantId",
                        column: x => x.RestaurantId,
                        principalTable: "restaurants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_qr_code_scans_CustomerId",
                table: "qr_code_scans",
                column: "CustomerId");

            migrationBuilder.CreateIndex(
                name: "IX_qr_code_scans_QrCodeId_CustomerId_ScanDate",
                table: "qr_code_scans",
                columns: new[] { "QrCodeId", "CustomerId", "ScanDate" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_qr_code_scans_RestaurantId",
                table: "qr_code_scans",
                column: "RestaurantId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "qr_code_scans");

            migrationBuilder.DropColumn(
                name: "ExpiresAt",
                table: "qr_codes");
        }
    }
}
