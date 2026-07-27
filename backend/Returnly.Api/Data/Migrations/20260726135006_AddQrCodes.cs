using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Returnly.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddQrCodes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "QrCodeId",
                table: "point_transactions",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "qr_codes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    RestaurantId = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    Type = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Token = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    PointsPerScan = table.Column<int>(type: "integer", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    TotalScans = table.Column<int>(type: "integer", nullable: false),
                    LastScannedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_qr_codes", x => x.Id);
                    table.CheckConstraint("CK_qr_codes_points_per_scan", "\"PointsPerScan\" > 0");
                    table.CheckConstraint("CK_qr_codes_total_scans", "\"TotalScans\" >= 0");
                    table.ForeignKey(
                        name: "FK_qr_codes_restaurants_RestaurantId",
                        column: x => x.RestaurantId,
                        principalTable: "restaurants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_point_transactions_QrCodeId",
                table: "point_transactions",
                column: "QrCodeId");

            migrationBuilder.CreateIndex(
                name: "IX_qr_codes_RestaurantId",
                table: "qr_codes",
                column: "RestaurantId");

            migrationBuilder.CreateIndex(
                name: "IX_qr_codes_RestaurantId_IsActive",
                table: "qr_codes",
                columns: new[] { "RestaurantId", "IsActive" });

            migrationBuilder.CreateIndex(
                name: "IX_qr_codes_RestaurantId_Name",
                table: "qr_codes",
                columns: new[] { "RestaurantId", "Name" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_qr_codes_Token",
                table: "qr_codes",
                column: "Token",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_point_transactions_qr_codes_QrCodeId",
                table: "point_transactions",
                column: "QrCodeId",
                principalTable: "qr_codes",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_point_transactions_qr_codes_QrCodeId",
                table: "point_transactions");

            migrationBuilder.DropTable(
                name: "qr_codes");

            migrationBuilder.DropIndex(
                name: "IX_point_transactions_QrCodeId",
                table: "point_transactions");

            migrationBuilder.DropColumn(
                name: "QrCodeId",
                table: "point_transactions");
        }
    }
}
